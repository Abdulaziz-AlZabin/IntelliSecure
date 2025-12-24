from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
import asyncio
from emergentintegrations.llm.chat import LlmChat, UserMessage
import aiohttp
from bs4 import BeautifulSoup
import feedparser
import json
import re
import io
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = os.environ['JWT_ALGORITHM']
JWT_EXPIRATION_HOURS = int(os.environ['JWT_EXPIRATION_HOURS'])

# Admin credentials
ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'Aarrafj7##7jfarraA')

# Security
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    company_name: str
    company_size: str
    num_employees: int
    industry: str
    region: str
    applied_policies: List[str]
    restrictions: List[str]
    security_solutions: List[str]

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class AdminLogin(BaseModel):
    username: str
    password: str

class AdminLoginModel(BaseModel):
    username: str
    password: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: str
    password_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CompanyProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    company_name: str
    company_size: str
    num_employees: int
    industry: str
    region: str
    applied_policies: List[str]
    restrictions: List[str]
    security_solutions: List[str]
    tags: Dict[str, Any]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttackProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    iocs: List[str]
    ttps: List[str]
    mitre_tactics: List[str] = []
    threat_actor: Optional[str] = None
    tags: Dict[str, Any]
    source_url: str
    severity: str
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== UTILITIES ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_jwt_token(user_id: str, email: str) -> str:
    payload = {
        "user_id": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def verify_jwt_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register")
async def register(user_data: UserRegister, background_tasks: BackgroundTasks):
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    profile = CompanyProfile(
        user_id=user.id,
        company_name=user_data.company_name,
        company_size=user_data.company_size,
        num_employees=user_data.num_employees,
        industry=user_data.industry,
        region=user_data.region,
        applied_policies=user_data.applied_policies,
        restrictions=user_data.restrictions,
        security_solutions=user_data.security_solutions,
        tags={
            "industry": user_data.industry,
            "region": user_data.region,
            "sec_solutions": user_data.security_solutions
        }
    )
    profile_dict = profile.model_dump()
    profile_dict['created_at'] = profile_dict['created_at'].isoformat()
    await db.profiles.insert_one(profile_dict)
    
    # Match existing attacks to new user immediately
    background_tasks.add_task(match_user_to_existing_attacks, profile)
    
    token = create_jwt_token(user.id, user.email)
    
    return {
        "message": "Registration successful",
        "token": token,
        "user": {"id": user.id, "email": user.email}
    }

@api_router.post("/auth/login")
async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    token = create_jwt_token(user["id"], user["email"])
    
    return {
        "message": "Login successful",
        "token": token,
        "user": {"id": user["id"], "email": user["email"]}
    }

@api_router.get("/auth/session")
async def get_session(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    return {
        "user": {"id": current_user["id"], "email": current_user["email"]},
        "profile": profile
    }

# ==================== PROFILE ENDPOINTS ====================

@api_router.get("/profile")
async def get_profile(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return profile

@api_router.put("/profile")
async def update_profile(profile_data: dict, current_user: dict = Depends(get_current_user)):
    # Update tags if relevant fields changed
    if any(key in profile_data for key in ['industry', 'region', 'security_solutions']):
        profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
        tags = profile.get('tags', {})
        if 'industry' in profile_data:
            tags['industry'] = profile_data['industry']
        if 'region' in profile_data:
            tags['region'] = profile_data['region']
        if 'security_solutions' in profile_data:
            tags['sec_solutions'] = profile_data['security_solutions']
        profile_data['tags'] = tags
    
    await db.profiles.update_one(
        {"user_id": current_user["id"]},
        {"$set": profile_data}
    )
    return {"message": "Profile updated successfully"}

# ==================== DASHBOARD ENDPOINTS ====================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    matched_attacks = await db.user_attacks.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    total_threats = len(matched_attacks)
    critical_threats = len([a for a in matched_attacks if a.get("severity") == "Critical"])
    high_threats = len([a for a in matched_attacks if a.get("severity") == "High"])
    medium_threats = len([a for a in matched_attacks if a.get("severity") == "Medium"])
    low_threats = len([a for a in matched_attacks if a.get("severity") == "Low"])
    
    # Trend data for last 7 days
    now = datetime.now(timezone.utc)
    trends = []
    for i in range(6, -1, -1):
        day = now - timedelta(days=i)
        day_start = day.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
        day_end = day.replace(hour=23, minute=59, second=59, microsecond=999999).isoformat()
        count = len([a for a in matched_attacks if day_start <= a.get('discovered_at', '') <= day_end])
        trends.append({
            "date": day.strftime("%m/%d"),
            "threats": count
        })
    
    return {
        "total_threats": total_threats,
        "critical_threats": critical_threats,
        "high_threats": high_threats,
        "medium_threats": medium_threats,
        "low_threats": low_threats,
        "industry": profile["industry"],
        "region": profile["region"],
        "trends": trends
    }

@api_router.get("/dashboard/attacks")
async def get_attacks(
    severity: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    query = {"user_id": current_user["id"]}
    if severity and severity != "all":
        query["severity"] = severity.capitalize()
    
    matched_attacks = await db.user_attacks.find(query, {"_id": 0}).sort("discovered_at", -1).to_list(100)
    
    if search:
        search_lower = search.lower()
        matched_attacks = [a for a in matched_attacks if search_lower in a.get('name', '').lower() or search_lower in a.get('description', '').lower()]
    
    return matched_attacks

@api_router.get("/dashboard/rules/{attack_id}")
async def get_attack_rules(attack_id: str, current_user: dict = Depends(get_current_user)):
    yara_rules = await db.yara_rules.find({"attack_id": attack_id}, {"_id": 0}).to_list(100)
    sigma_rules = await db.sigma_rules.find({"attack_id": attack_id}, {"_id": 0}).to_list(100)
    
    # Get attack details for mitigation
    attack = await db.attacks.find_one({"id": attack_id}, {"_id": 0})
    mitigations = []
    if attack:
        # Use Gemini-generated mitigations if available
        gemini_mitigations = attack.get('mitigations', [])
        if gemini_mitigations:
            for idx, mitigation_text in enumerate(gemini_mitigations, 1):
                mitigations.append({
                    "title": f"Mitigation Step {idx}",
                    "description": mitigation_text
                })
        else:
            # Fallback to basic mitigations if Gemini mitigations not available
            for ttp in attack.get('ttps', [])[:3]:
                mitigations.append({
                    "title": f"Mitigation for {ttp}",
                    "description": f"Implement monitoring and detection for {ttp} activities. Review security policies and access controls."
                })
    
    return {
        "yara_rules": yara_rules,
        "sigma_rules": sigma_rules,
        "mitigations": mitigations,
        "mitre_tactics": attack.get('mitre_tactics', []) if attack else [],
        "threat_actor": attack.get('threat_actor') if attack else None
    }

@api_router.get("/dashboard/analytics")
async def get_analytics(current_user: dict = Depends(get_current_user)):
    matched_attacks = await db.user_attacks.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    # Severity distribution
    severity_dist = {
        "Critical": len([a for a in matched_attacks if a.get("severity") == "Critical"]),
        "High": len([a for a in matched_attacks if a.get("severity") == "High"]),
        "Medium": len([a for a in matched_attacks if a.get("severity") == "Medium"]),
        "Low": len([a for a in matched_attacks if a.get("severity") == "Low"])
    }
    
    # Top threat actors
    threat_actors = {}
    for attack in matched_attacks:
        actor = attack.get('threat_actor', 'Unknown')
        threat_actors[actor] = threat_actors.get(actor, 0) + 1
    
    top_actors = sorted(threat_actors.items(), key=lambda x: x[1], reverse=True)[:5]
    
    return {
        "severity_distribution": severity_dist,
        "top_threat_actors": [{"name": actor, "count": count} for actor, count in top_actors]
    }

@api_router.get("/dashboard/timeline")
async def get_timeline(current_user: dict = Depends(get_current_user)):
    matched_attacks = await db.user_attacks.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("discovered_at", -1).limit(50).to_list(50)
    
    timeline = []
    for attack in matched_attacks:
        timeline.append({
            "id": attack.get('id'),
            "attack_id": attack.get('attack_id'),
            "name": attack.get('name'),
            "severity": attack.get('severity'),
            "timestamp": attack.get('discovered_at')
        })
    
    return timeline

@api_router.get("/dashboard/geo-map")
async def get_geo_map(current_user: dict = Depends(get_current_user)):
    """Get geographic distribution of attacks"""
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Get all attacks with location data
    matched_attacks = await db.user_attacks.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Region to coordinates mapping
    region_coords = {
        "North America": {"lat": 40.7128, "lon": -74.0060, "name": "New York, USA"},
        "Europe": {"lat": 51.5074, "lon": -0.1278, "name": "London, UK"},
        "Asia": {"lat": 35.6762, "lon": 139.6503, "name": "Tokyo, Japan"},
        "Middle East": {"lat": 25.2048, "lon": 55.2708, "name": "Dubai, UAE"},
        "Latin America": {"lat": -23.5505, "lon": -46.6333, "name": "São Paulo, Brazil"},
        "Africa": {"lat": -1.2864, "lon": 36.8172, "name": "Nairobi, Kenya"},
        "Oceania": {"lat": -33.8688, "lon": 151.2093, "name": "Sydney, Australia"},
        "Global": {"lat": 0, "lon": 0, "name": "Global"}
    }
    
    # Aggregate attacks by region
    location_data = {}
    for attack in matched_attacks:
        # Get attack details to find regions
        attack_details = await db.attacks.find_one({"id": attack.get("attack_id")}, {"_id": 0})
        if attack_details:
            regions = attack_details.get('tags', {}).get('regions', ['Global'])
            for region in regions:
                if region not in location_data:
                    location_data[region] = {
                        "region": region,
                        "coordinates": region_coords.get(region, {"lat": 0, "lon": 0, "name": region}),
                        "attacks": [],
                        "total": 0,
                        "critical": 0,
                        "high": 0,
                        "medium": 0,
                        "low": 0
                    }
                
                location_data[region]["attacks"].append({
                    "id": attack.get('id'),
                    "name": attack.get('name'),
                    "severity": attack.get('severity'),
                    "discovered_at": attack.get('discovered_at')
                })
                location_data[region]["total"] += 1
                
                severity = attack.get('severity', 'Low')
                location_data[region][severity.lower()] += 1
    
    return {
        "user_region": profile.get('region'),
        "locations": list(location_data.values())
    }

@api_router.post("/dashboard/export-rules/{attack_id}")
async def export_rules(attack_id: str, rule_type: str, current_user: dict = Depends(get_current_user)):
    if rule_type == "yara":
        rules = await db.yara_rules.find({"attack_id": attack_id}, {"_id": 0}).to_list(100)
        content = "\n\n".join([r['rule_content'] for r in rules])
        filename = f"yara_rules_{attack_id}.yar"
    else:
        rules = await db.sigma_rules.find({"attack_id": attack_id}, {"_id": 0}).to_list(100)
        content = "\n---\n".join([r['rule_content'] for r in rules])
        filename = f"sigma_rules_{attack_id}.yml"
    
    return StreamingResponse(
        io.BytesIO(content.encode()),
        media_type="text/plain",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@api_router.get("/dashboard/weekly-report")
async def generate_weekly_report(current_user: dict = Depends(get_current_user)):
    """Generate a PDF report of threats detected in the past week"""
    profile = await db.profiles.find_one({"user_id": current_user["id"]}, {"_id": 0})
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    
    # Get threats from the past week
    week_ago = datetime.now(timezone.utc) - timedelta(days=7)
    week_ago_str = week_ago.isoformat()
    
    matched_attacks = await db.user_attacks.find({
        "user_id": current_user["id"],
        "discovered_at": {"$gte": week_ago_str}
    }, {"_id": 0}).sort("discovered_at", -1).to_list(1000)
    
    # Create PDF
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=18)
    
    # Container for PDF elements
    elements = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=16,
        textColor=colors.HexColor('#667eea'),
        spaceAfter=12,
        spaceBefore=12
    )
    
    # Title
    elements.append(Paragraph("Intellisecure Weekly Threat Report", title_style))
    elements.append(Spacer(1, 12))
    
    # Report metadata
    report_date = datetime.now(timezone.utc).strftime("%B %d, %Y")
    elements.append(Paragraph(f"<b>Report Date:</b> {report_date}", styles['Normal']))
    elements.append(Paragraph(f"<b>Period:</b> {week_ago.strftime('%B %d, %Y')} - {datetime.now(timezone.utc).strftime('%B %d, %Y')}", styles['Normal']))
    elements.append(Paragraph(f"<b>Company:</b> {profile['company_name']}", styles['Normal']))
    elements.append(Paragraph(f"<b>Industry:</b> {profile['industry']}", styles['Normal']))
    elements.append(Paragraph(f"<b>Region:</b> {profile['region']}", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Executive Summary
    elements.append(Paragraph("Executive Summary", heading_style))
    
    critical_count = len([a for a in matched_attacks if a.get('severity') == 'Critical'])
    high_count = len([a for a in matched_attacks if a.get('severity') == 'High'])
    medium_count = len([a for a in matched_attacks if a.get('severity') == 'Medium'])
    low_count = len([a for a in matched_attacks if a.get('severity') == 'Low'])
    
    summary_data = [
        ['Severity Level', 'Count'],
        ['Critical', str(critical_count)],
        ['High', str(high_count)],
        ['Medium', str(medium_count)],
        ['Low', str(low_count)],
        ['Total Threats', str(len(matched_attacks))]
    ]
    
    summary_table = Table(summary_data, colWidths=[3*inch, 2*inch])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#667eea')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.lightgrey])
    ]))
    
    elements.append(summary_table)
    elements.append(Spacer(1, 20))
    
    # Detailed Threats
    if matched_attacks:
        elements.append(Paragraph("Detailed Threat Analysis", heading_style))
        elements.append(Spacer(1, 12))
        
        for i, attack in enumerate(matched_attacks[:20], 1):  # Limit to 20 threats
            elements.append(Paragraph(f"<b>{i}. {attack['name']}</b>", styles['Heading3']))
            elements.append(Paragraph(f"<b>Severity:</b> {attack.get('severity', 'Unknown')}", styles['Normal']))
            elements.append(Paragraph(f"<b>Detected:</b> {datetime.fromisoformat(attack['discovered_at']).strftime('%B %d, %Y %H:%M UTC')}", styles['Normal']))
            
            if attack.get('threat_actor'):
                elements.append(Paragraph(f"<b>Threat Actor:</b> {attack['threat_actor']}", styles['Normal']))
            
            elements.append(Paragraph(f"<b>Description:</b> {attack.get('description', 'No description available')}", styles['Normal']))
            elements.append(Paragraph(f"<b>Source:</b> <link href='{attack.get('source_url', '')}'>{attack.get('source_url', 'N/A')}</link>", styles['Normal']))
            elements.append(Spacer(1, 12))
            
            if i % 5 == 0 and i < len(matched_attacks):
                elements.append(PageBreak())
    else:
        elements.append(Paragraph("No threats detected in the past week.", styles['Normal']))
        elements.append(Spacer(1, 12))
        elements.append(Paragraph("Your security posture remains strong. Continue monitoring for emerging threats.", styles['Normal']))
    
    # Recommendations
    elements.append(PageBreak())
    elements.append(Paragraph("Recommendations", heading_style))
    
    if critical_count > 0 or high_count > 0:
        elements.append(Paragraph("• <b>Immediate Action Required:</b> Review and address all Critical and High severity threats within 24 hours.", styles['Normal']))
        elements.append(Spacer(1, 6))
    
    elements.append(Paragraph("• <b>Deploy Security Rules:</b> Implement the generated Yara and Sigma rules in your security infrastructure.", styles['Normal']))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("• <b>Update Security Policies:</b> Review and update incident response procedures based on detected threat patterns.", styles['Normal']))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("• <b>Team Training:</b> Conduct security awareness training for your team on recent threat vectors.", styles['Normal']))
    elements.append(Spacer(1, 6))
    elements.append(Paragraph("• <b>Continuous Monitoring:</b> Ensure 24/7 monitoring is in place for real-time threat detection.", styles['Normal']))
    elements.append(Spacer(1, 20))
    
    # Footer
    elements.append(Paragraph("___", styles['Normal']))
    elements.append(Paragraph(f"This report was generated by Intellisecure on {report_date}", styles['Normal']))
    elements.append(Paragraph("For more information, visit your Intellisecure dashboard.", styles['Normal']))
    
    # Build PDF
    doc.build(elements)
    buffer.seek(0)
    
    filename = f"intellisecure_weekly_report_{datetime.now(timezone.utc).strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

# ==================== INSIGHTS ENDPOINT ====================

@api_router.get("/insights")
async def get_insights():
    insights = await db.threat_intel.find({}, {"_id": 0}).sort("published_at", -1).limit(20).to_list(20)
    return insights

@api_router.get("/dashboard/threat-hunt")
async def get_threat_hunt_queries(current_user: dict = Depends(get_current_user)):
    """Generate threat hunting queries for Splunk, Elastic, and QRadar using all IOCs from attacks"""
    try:
        # Get all user's matched attacks
        user_attacks = await db.user_attacks.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
        
        # Collect all IOCs from these attacks
        all_iocs = {
            "ips": [],
            "domains": [],
            "hashes": [],
            "urls": [],
            "emails": []
        }
        
        ioc_count = 0
        attack_count = len(user_attacks)
        
        for user_attack in user_attacks:
            attack = await db.attacks.find_one({"id": user_attack.get("attack_id")}, {"_id": 0})
            if attack and attack.get("iocs"):
                for ioc in attack.get("iocs", []):
                    ioc_str = str(ioc).strip()
                    ioc_count += 1
                    
                    # Categorize IOCs (simple heuristic)
                    if "." in ioc_str and any(tld in ioc_str.lower() for tld in [".com", ".net", ".org", ".io", ".ru", ".cn"]):
                        if ioc_str.startswith("http"):
                            all_iocs["urls"].append(ioc_str)
                        elif "@" in ioc_str:
                            all_iocs["emails"].append(ioc_str)
                        else:
                            all_iocs["domains"].append(ioc_str)
                    elif len(ioc_str) in [32, 40, 64, 128]:  # MD5, SHA1, SHA256, SHA512
                        all_iocs["hashes"].append(ioc_str)
                    elif ioc_str.replace(".", "").isdigit() and ioc_str.count(".") == 3:
                        all_iocs["ips"].append(ioc_str)
                    else:
                        # Default to domains if unclear
                        all_iocs["domains"].append(ioc_str)
        
        # Remove duplicates
        for category in all_iocs:
            all_iocs[category] = list(set(all_iocs[category]))
        
        # Generate SIEM queries using Gemini
        gemini_key = os.environ['GEMINI_API_KEY']
        chat = LlmChat(
            api_key=gemini_key,
            session_id="threat_hunt_queries",
            system_message="""You are a cybersecurity SIEM expert. Generate threat hunting queries for different SIEM platforms.
Create optimized, production-ready queries that security analysts can use immediately.
Return ONLY valid JSON without any markdown formatting."""
        ).with_model("gemini", "gemini-2.5-flash")
        
        ioc_summary = f"""
IPs: {len(all_iocs['ips'])} - {all_iocs['ips'][:10]}
Domains: {len(all_iocs['domains'])} - {all_iocs['domains'][:10]}
Hashes: {len(all_iocs['hashes'])} - {all_iocs['hashes'][:10]}
URLs: {len(all_iocs['urls'])} - {all_iocs['urls'][:5]}
Emails: {len(all_iocs['emails'])} - {all_iocs['emails'][:5]}
"""
        
        prompt = f"""Generate threat hunting queries for these IOCs from {attack_count} security threats:

{ioc_summary}

Create queries for:
1. Splunk SPL (Search Processing Language)
2. Elastic (Elasticsearch Query DSL or KQL)
3. QRadar AQL (Ariel Query Language)

Each query should:
- Search for any of the IOCs in relevant fields (src_ip, dest_ip, domain, url, hash, etc.)
- Include time range for last 7 days
- Be production-ready and optimized
- Include comments explaining the query

Return as JSON:
{{
  "splunk": {{
    "query": "actual SPL query",
    "description": "what this query does"
  }},
  "elastic": {{
    "query": "actual KQL or DSL query",
    "description": "what this query does"
  }},
  "qradar": {{
    "query": "actual AQL query",
    "description": "what this query does"
  }}
}}"""
        
        message = UserMessage(text=prompt)
        response = await chat.send_message(message)
        
        # Parse JSON response
        json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
        if json_match:
            queries = json.loads(json_match.group())
        else:
            # Fallback queries if Gemini fails
            queries = generate_fallback_queries(all_iocs)
        
        return {
            "queries": queries,
            "ioc_stats": {
                "total_iocs": ioc_count,
                "total_attacks": attack_count,
                "ips": len(all_iocs["ips"]),
                "domains": len(all_iocs["domains"]),
                "hashes": len(all_iocs["hashes"]),
                "urls": len(all_iocs["urls"]),
                "emails": len(all_iocs["emails"])
            },
            "last_updated": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logging.error(f"Error generating threat hunt queries: {e}")
        # Return fallback queries
        return {
            "queries": {
                "splunk": {
                    "query": "index=* (sourcetype=firewall OR sourcetype=proxy OR sourcetype=dns) | stats count by src_ip, dest_ip, url, query",
                    "description": "Basic threat hunting query across common data sources"
                },
                "elastic": {
                    "query": "event.category:(network OR web OR dns) AND (@timestamp >= now-7d)",
                    "description": "Search network and web events from last 7 days"
                },
                "qradar": {
                    "query": "SELECT * FROM events WHERE LOGSOURCETYPENAME(logsourceid) IN ('Firewall', 'Proxy', 'DNS') LAST 7 DAYS",
                    "description": "Query common log sources for last 7 days"
                }
            },
            "ioc_stats": {
                "total_iocs": 0,
                "total_attacks": 0,
                "ips": 0,
                "domains": 0,
                "hashes": 0,
                "urls": 0,
                "emails": 0
            },
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "error": str(e)
        }

def generate_fallback_queries(all_iocs: dict) -> dict:
    """Generate basic fallback queries when Gemini is unavailable"""
    ip_list = ", ".join([f'"{ip}"' for ip in all_iocs["ips"][:50]])
    domain_list = ", ".join([f'"{domain}"' for domain in all_iocs["domains"][:50]])
    hash_list = ", ".join([f'"{h}"' for h in all_iocs["hashes"][:50]])
    
    return {
        "splunk": {
            "query": f"""index=* earliest=-7d latest=now 
(src_ip IN ({ip_list if ip_list else '""'}) OR dest_ip IN ({ip_list if ip_list else '""'}) 
OR url IN ({domain_list if domain_list else '""'}) OR query IN ({domain_list if domain_list else '""'})
OR file_hash IN ({hash_list if hash_list else '""'}))
| table _time, src_ip, dest_ip, url, file_hash, action
| sort -_time""",
            "description": "Search for known IOCs across all indexes for the last 7 days"
        },
        "elastic": {
            "query": f"""(source.ip:({' OR '.join(all_iocs['ips'][:50]) if all_iocs['ips'] else '*'}) OR 
destination.ip:({' OR '.join(all_iocs['ips'][:50]) if all_iocs['ips'] else '*'}) OR
url.domain:({' OR '.join(all_iocs['domains'][:50]) if all_iocs['domains'] else '*'}) OR
file.hash.sha256:({' OR '.join(all_iocs['hashes'][:50]) if all_iocs['hashes'] else '*'}))
AND @timestamp >= now-7d""",
            "description": "KQL query to search for known IOCs in ECS-formatted logs"
        },
        "qradar": {
            "query": f"""SELECT DATEFORMAT(starttime, 'YYYY-MM-dd HH:mm:ss') as Time,
sourceip, destinationip, url, username, LOGSOURCENAME(logsourceid)
FROM events
WHERE (sourceip IN ({ip_list if ip_list else "'0.0.0.0'"}) 
OR destinationip IN ({ip_list if ip_list else "'0.0.0.0'"}))
LAST 7 DAYS""",
            "description": "AQL query to hunt for known malicious IPs in QRadar"
        }
    }

# ==================== ADMIN ENDPOINTS ====================

@api_router.post("/admin/login")
async def admin_login(credentials: AdminLogin):
    if credentials.username == ADMIN_USERNAME and credentials.password == ADMIN_PASSWORD:
        token = create_jwt_token("admin", "admin")
        return {
            "message": "Admin login successful",
            "token": token,
            "user": {"id": "admin", "email": "admin", "role": "admin"}
        }
    raise HTTPException(status_code=401, detail="Invalid admin credentials")

async def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    payload = verify_jwt_token(token)
    if payload.get("user_id") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return payload

@api_router.get("/admin/companies")
async def get_all_companies(admin: dict = Depends(verify_admin)):
    profiles = await db.profiles.find({}, {"_id": 0}).to_list(1000)
    
    # Enrich with user data
    for profile in profiles:
        user = await db.users.find_one({"id": profile["user_id"]}, {"_id": 0, "password_hash": 0})
        if user:
            profile["user_email"] = user.get("email")
            profile["created_at"] = user.get("created_at")
    
    return profiles

@api_router.get("/admin/resources")
async def get_resources(admin: dict = Depends(verify_admin)):
    return {"sources": THREAT_SOURCES}

@api_router.post("/admin/resources")
async def add_resource(resource_url: dict, admin: dict = Depends(verify_admin)):
    url = resource_url.get("url")
    if url and url not in THREAT_SOURCES:
        THREAT_SOURCES.append(url)
        return {"message": "Resource added successfully", "sources": THREAT_SOURCES}
    raise HTTPException(status_code=400, detail="Invalid or duplicate URL")

@api_router.delete("/admin/resources")
async def delete_resource(resource_url: dict, admin: dict = Depends(verify_admin)):
    url = resource_url.get("url")
    if url in THREAT_SOURCES:
        THREAT_SOURCES.remove(url)
        return {"message": "Resource removed successfully", "sources": THREAT_SOURCES}
    raise HTTPException(status_code=400, detail="URL not found")

@api_router.get("/admin/attacks")
async def get_all_attacks(admin: dict = Depends(verify_admin)):
    attacks = await db.attacks.find({}, {"_id": 0}).sort("discovered_at", -1).limit(100).to_list(100)
    return attacks

# ==================== THREAT HUNT IOC MANAGEMENT ====================

class ThreatHuntIOC(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str  # ip, domain, hash, url, email
    value: str
    description: str = ""
    source: str = ""
    added_by: str = "admin"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

@api_router.get("/admin/threat-hunt-iocs")
async def get_threat_hunt_iocs(admin: dict = Depends(verify_admin)):
    """Get all curated IOCs for threat hunting"""
    iocs = await db.threat_hunt_iocs.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Get statistics
    stats = {
        "total": len(iocs),
        "ips": len([ioc for ioc in iocs if ioc.get("type") == "ip"]),
        "domains": len([ioc for ioc in iocs if ioc.get("type") == "domain"]),
        "hashes": len([ioc for ioc in iocs if ioc.get("type") == "hash"]),
        "urls": len([ioc for ioc in iocs if ioc.get("type") == "url"]),
        "emails": len([ioc for ioc in iocs if ioc.get("type") == "email"])
    }
    
    return {"iocs": iocs, "stats": stats}

@api_router.post("/admin/threat-hunt-iocs")
async def add_threat_hunt_ioc(ioc: ThreatHuntIOC, admin: dict = Depends(verify_admin)):
    """Add a new IOC for threat hunting"""
    ioc_dict = ioc.model_dump()
    ioc_dict['created_at'] = ioc_dict['created_at'].isoformat()
    await db.threat_hunt_iocs.insert_one(ioc_dict)
    return {"message": "IOC added successfully", "ioc": ioc_dict}

@api_router.delete("/admin/threat-hunt-iocs/{ioc_id}")
async def delete_threat_hunt_ioc(ioc_id: str, admin: dict = Depends(verify_admin)):
    """Delete an IOC from threat hunting collection"""
    result = await db.threat_hunt_iocs.delete_one({"id": ioc_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="IOC not found")
    return {"message": "IOC deleted successfully"}

@api_router.post("/admin/threat-hunt-iocs/bulk")
async def add_bulk_threat_hunt_iocs(iocs_data: dict, admin: dict = Depends(verify_admin)):
    """Add multiple IOCs at once"""
    iocs_list = iocs_data.get("iocs", [])
    added_count = 0
    
    for ioc_data in iocs_list:
        ioc = ThreatHuntIOC(
            type=ioc_data.get("type"),
            value=ioc_data.get("value"),
            description=ioc_data.get("description", ""),
            source=ioc_data.get("source", "")
        )
        ioc_dict = ioc.model_dump()
        ioc_dict['created_at'] = ioc_dict['created_at'].isoformat()
        await db.threat_hunt_iocs.insert_one(ioc_dict)
        added_count += 1
    
    return {"message": f"{added_count} IOCs added successfully"}

@api_router.put("/admin/attack/{attack_id}/rules")
async def update_attack_rules(attack_id: str, rules_data: dict, admin: dict = Depends(verify_admin)):
    # Update Yara rules with IOCs
    yara_iocs = rules_data.get("yara_iocs", [])
    attack = await db.attacks.find_one({"id": attack_id}, {"_id": 0})
    
    if not attack:
        raise HTTPException(status_code=404, detail="Attack not found")
    
    # Generate enhanced Yara rule with provided IOCs
    yara_rule_content = f"""rule {attack['name'].replace(' ', '_')}_Detection
{{
    meta:
        description = "{attack['description']}"
        severity = "{attack['severity']}"
        threat_actor = "{attack.get('threat_actor', 'Unknown')}"
        source = "{attack['source_url']}"
        mitre_tactics = "{', '.join(attack.get('mitre_tactics', []))}"
        author = "Intellisecure Admin"
        date = "{datetime.now(timezone.utc).strftime('%Y-%m-%d')}"
    
    strings:"""
    
    for i, ioc in enumerate(yara_iocs[:10], 1):
        if ioc.get('type') == 'hash':
            yara_rule_content += f'\n        $hash{i} = "{ioc["value"]}"'
        elif ioc.get('type') == 'ip':
            yara_rule_content += f'\n        $ip{i} = "{ioc["value"]}"'
        elif ioc.get('type') == 'domain':
            yara_rule_content += f'\n        $domain{i} = "{ioc["value"]}"'
        elif ioc.get('type') == 'string':
            yara_rule_content += f'\n        $str{i} = "{ioc["value"]}" wide ascii'
        elif ioc.get('type') == 'filename':
            yara_rule_content += f'\n        $file{i} = "{ioc["value"]}" nocase'
    
    yara_rule_content += """
    
    condition:
        any of them
}}"""
    
    # Update Yara rule in database
    await db.yara_rules.update_many(
        {"attack_id": attack_id},
        {"$set": {"rule_content": yara_rule_content, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    # Generate enhanced Sigma rule
    sigma_ttps = rules_data.get("sigma_ttps", attack.get('ttps', []))
    sigma_rule_content = f"""title: {attack['name']} Detection
id: {str(uuid.uuid4())}
status: stable
description: |
    {attack['description']}
    Enhanced rule with specific TTPs and detection patterns.
author: Intellisecure Admin
date: {datetime.now(timezone.utc).strftime('%Y/%m/%d')}
modified: {datetime.now(timezone.utc).strftime('%Y/%m/%d')}
references:
    - {attack['source_url']}
tags:"""
    
    for tactic in attack.get('mitre_tactics', []):
        sigma_rule_content += f"\n    - attack.{tactic.lower().replace(' ', '_')}"
    
    sigma_rule_content += f"""
logsource:
    category: process_creation
    product: windows
detection:
    selection_process:"""
    
    for i, ttp in enumerate(sigma_ttps[:5], 1):
        sigma_rule_content += f"\n        - CommandLine|contains: '{ttp}'"
    
    sigma_rule_content += """
    selection_network:"""
    
    for ioc in yara_iocs:
        if ioc.get('type') in ['ip', 'domain']:
            sigma_rule_content += f"\n        - DestinationHostname|contains: '{ioc['value']}'"
    
    sigma_rule_content += """
    condition: selection_process or selection_network
falsepositives:
    - Legitimate administrative activity
    - Security software updates
level: """
    
    severity_map = {"Critical": "critical", "High": "high", "Medium": "medium", "Low": "low"}
    sigma_rule_content += severity_map.get(attack['severity'], 'medium')
    
    # Update Sigma rule in database
    await db.sigma_rules.update_many(
        {"attack_id": attack_id},
        {"$set": {"rule_content": sigma_rule_content, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    
    return {
        "message": "Rules updated successfully",
        "yara_rule": yara_rule_content,
        "sigma_rule": sigma_rule_content
    }

# ==================== WEB SCRAPING & LLM ANALYSIS ====================

THREAT_SOURCES = [
    "https://www.cisa.gov/news-events/cybersecurity-advisories",
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.bleepingcomputer.com/feed/",
    "https://www.darkreading.com/rss.xml",
    "https://www.securityweek.com/feed/",
    "https://threatpost.com/feed/",
    "https://krebsonsecurity.com/feed/",
    "https://www.us-cert.gov/ncas/current-activity.xml",
    "https://www.schneier.com/blog/atom.xml",
    "https://www.sans.org/reading-room/whitepapers/rss",
    "https://www.csoonline.com/feed/",
    "https://www.infosecurity-magazine.com/rss/news/",
    "https://nakedsecurity.sophos.com/feed/",
    "https://grahamcluley.com/feed/",
    "https://www.cyberscoop.com/feed/"
]

async def scrape_threat_feeds():
    try:
        async with aiohttp.ClientSession() as session:
            for source in THREAT_SOURCES:
                try:
                    feed = feedparser.parse(source)
                    
                    for entry in feed.entries[:5]:
                        existing = await db.scraped_data.find_one({"url": entry.link})
                        if existing:
                            continue
                        
                        # Get published date
                        published_date = datetime.now(timezone.utc)
                        if hasattr(entry, 'published_parsed') and entry.published_parsed:
                            published_date = datetime(*entry.published_parsed[:6], tzinfo=timezone.utc)
                        
                        scraped_doc = {
                            "id": str(uuid.uuid4()),
                            "title": entry.title,
                            "url": entry.link,
                            "summary": entry.get('summary', '')[:500],
                            "source": source,
                            "published_at": published_date.isoformat(),
                            "processed": False
                        }
                        await db.scraped_data.insert_one(scraped_doc)
                        
                        intel_doc = {
                            "id": str(uuid.uuid4()),
                            "title": entry.title,
                            "summary": entry.get('summary', '')[:300],
                            "url": entry.link,
                            "published_at": published_date.isoformat(),
                            "source": source
                        }
                        await db.threat_intel.insert_one(intel_doc)
                        
                except Exception as e:
                    logging.error(f"Error scraping {source}: {e}")
                    continue
                    
    except Exception as e:
        logging.error(f"Error in scrape_threat_feeds: {e}")

async def analyze_with_llm():
    try:
        unprocessed = await db.scraped_data.find({"processed": False}, {"_id": 0}).limit(2).to_list(2)
        
        if not unprocessed:
            return
        
        gemini_key = os.environ['GEMINI_API_KEY']
        chat = LlmChat(
            api_key=gemini_key,
            session_id="threat_analysis",
            system_message="""You are a cybersecurity threat intelligence analyst. Analyze threat articles and extract:
1. Attack name
2. Description (detailed and comprehensive)
3. IOCs (IPs, domains, hashes)
4. TTPs (techniques)
5. MITRE ATT&CK tactics (e.g., Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, Exfiltration, Command and Control, Impact)
6. Threat actor/group (if mentioned)
7. Target industries (Finance, Healthcare, Technology, Government, Energy, Retail, Manufacturing, Education, or Global)
8. Target regions (North America, Europe, Asia, Middle East, Latin America, Africa, Oceania, or Global)
9. Affected security solutions (SIEM, EDR, IDS/IPS, Firewall, Antivirus, DLP, or All)
10. Severity (Critical, High, Medium, Low)
11. Mitigation recommendations (at least 3 actionable steps)

Return ONLY valid JSON:
{
  "name": "attack name",
  "description": "detailed comprehensive description",
  "iocs": ["ioc1", "ioc2"],
  "ttps": ["ttp1", "ttp2"],
  "mitre_tactics": ["tactic1", "tactic2"],
  "threat_actor": "actor name or null",
  "industries": ["industry1"],
  "regions": ["region1"],
  "sec_solutions": ["solution1"],
  "severity": "High",
  "mitigations": ["mitigation step 1", "mitigation step 2", "mitigation step 3"]
}"""
        ).with_model("gemini", "gemini-2.5-flash")
        
        for article in unprocessed:
            try:
                prompt = f"""Analyze this cybersecurity threat in detail:

Title: {article['title']}
URL: {article['url']}
Summary: {article['summary']}

Provide comprehensive threat intelligence with detailed description and actionable mitigation steps in JSON format."""
                
                message = UserMessage(text=prompt)
                response = await chat.send_message(message)
                
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
                if json_match:
                    attack_data = json.loads(json_match.group())
                    
                    attack = AttackProfile(
                        name=attack_data.get('name', article['title']),
                        description=attack_data.get('description', ''),
                        iocs=attack_data.get('iocs', []),
                        ttps=attack_data.get('ttps', []),
                        mitre_tactics=attack_data.get('mitre_tactics', []),
                        threat_actor=attack_data.get('threat_actor'),
                        tags={
                            "industries": attack_data.get('industries', ['Global']),
                            "regions": attack_data.get('regions', ['Global']),
                            "sec_solutions": attack_data.get('sec_solutions', ['All'])
                        },
                        source_url=article['url'],
                        severity=attack_data.get('severity', 'Medium')
                    )
                    
                    attack_dict = attack.model_dump()
                    attack_dict['discovered_at'] = attack_dict['discovered_at'].isoformat()
                    # Store mitigations separately
                    attack_dict['mitigations'] = attack_data.get('mitigations', [])
                    await db.attacks.insert_one(attack_dict)
                    
                    await match_attacks_to_users(attack)
                    
                await db.scraped_data.update_one(
                    {"id": article['id']},
                    {"$set": {"processed": True}}
                )
                
            except Exception as e:
                logging.error(f"Error analyzing article {article['id']}: {e}")
                await db.scraped_data.update_one(
                    {"id": article['id']},
                    {"$set": {"processed": True}}
                )
                continue
                
    except Exception as e:
        logging.error(f"Error in analyze_with_llm: {e}")

async def match_attacks_to_users(attack: AttackProfile):
    try:
        profiles = await db.profiles.find({}, {"_id": 0}).to_list(1000)
        
        for profile in profiles:
            match_score = 0
            
            if profile['tags']['industry'] in attack.tags['industries'] or 'Global' in attack.tags['industries']:
                match_score += 1
            
            if profile['tags']['region'] in attack.tags['regions'] or 'Global' in attack.tags['regions']:
                match_score += 1
            
            for solution in profile['tags']['sec_solutions']:
                if solution in attack.tags['sec_solutions'] or 'All' in attack.tags['sec_solutions']:
                    match_score += 1
                    break
            
            if match_score >= 2:
                existing = await db.user_attacks.find_one({
                    "user_id": profile['user_id'],
                    "attack_id": attack.id
                })
                
                if not existing:
                    user_attack = {
                        "id": str(uuid.uuid4()),
                        "user_id": profile['user_id'],
                        "attack_id": attack.id,
                        "name": attack.name,
                        "description": attack.description,
                        "severity": attack.severity,
                        "source_url": attack.source_url,
                        "threat_actor": attack.threat_actor,
                        "discovered_at": attack.discovered_at.isoformat(),
                        "linked_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.user_attacks.insert_one(user_attack)
                    await generate_rules(attack, profile['tags']['sec_solutions'])
                    
    except Exception as e:
        logging.error(f"Error in match_attacks_to_users: {e}")

async def match_user_to_existing_attacks(profile: CompanyProfile):
    """Match a new user profile to existing attacks in the database"""
    try:
        attacks = await db.attacks.find({}, {"_id": 0}).to_list(1000)
        
        for attack in attacks:
            match_score = 0
            
            # Check industry match
            if profile.tags['industry'] in attack['tags']['industries'] or 'Global' in attack['tags']['industries']:
                match_score += 1
            
            # Check region match
            if profile.tags['region'] in attack['tags']['regions'] or 'Global' in attack['tags']['regions']:
                match_score += 1
            
            # Check security solutions match
            for solution in profile.tags['sec_solutions']:
                if solution in attack['tags']['sec_solutions'] or 'All' in attack['tags']['sec_solutions']:
                    match_score += 1
                    break
            
            # If match score is 2 or higher, link the attack to the user
            if match_score >= 2:
                existing = await db.user_attacks.find_one({
                    "user_id": profile.user_id,
                    "attack_id": attack['id']
                })
                
                if not existing:
                    user_attack = {
                        "id": str(uuid.uuid4()),
                        "user_id": profile.user_id,
                        "attack_id": attack['id'],
                        "name": attack['name'],
                        "description": attack['description'],
                        "severity": attack['severity'],
                        "source_url": attack['source_url'],
                        "threat_actor": attack.get('threat_actor'),
                        "discovered_at": attack['discovered_at'],
                        "linked_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.user_attacks.insert_one(user_attack)
                    await generate_rules_for_attack(attack, profile.tags['sec_solutions'])
                    
    except Exception as e:
        logging.error(f"Error in match_user_to_existing_attacks: {e}")

async def generate_rules_for_attack(attack: dict, sec_solutions: List[str]):
    """Generate rules for a specific attack and user"""
    try:
        # Check if rules already exist for this attack
        existing_yara = await db.yara_rules.find_one({"attack_id": attack['id']})
        existing_sigma = await db.sigma_rules.find_one({"attack_id": attack['id']})
        
        if not existing_yara:
            yara_rule_content = f"""rule {attack['name'].replace(' ', '_')}_Detection
{{
    meta:
        description = "{attack['description']}"
        severity = "{attack['severity']}"
        threat_actor = "{attack.get('threat_actor', 'Unknown')}"
        source = "{attack['source_url']}"
        mitre_tactics = "{', '.join(attack.get('mitre_tactics', []))}"
    
    strings:
        $ioc1 = "{attack['iocs'][0] if attack.get('iocs') else 'malicious_indicator'}"
        $ttp1 = "{attack['ttps'][0] if attack.get('ttps') else 'suspicious_behavior'}"
    
    condition:
        any of them
}}"""
            
            yara_rule = {
                "id": str(uuid.uuid4()),
                "attack_id": attack['id'],
                "rule_name": f"{attack['name'].replace(' ', '_')}_Yara",
                "rule_content": yara_rule_content
            }
            await db.yara_rules.insert_one(yara_rule)
        
        if not existing_sigma:
            sigma_rule_content = f"""title: {attack['name']} Detection
id: {str(uuid.uuid4())}
status: experimental
description: Detects {attack['description']}
author: Intellisecure AI
date: {datetime.now(timezone.utc).strftime('%Y/%m/%d')}
references:
    - {attack['source_url']}
tags:
    - attack.{attack.get('mitre_tactics', ['unknown'])[0].lower().replace(' ', '_')}
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains:
            - '{attack.get('iocs', ['malicious'])[0]}'
            - '{attack.get('ttps', ['suspicious'])[0]}'
    condition: selection
falsepositives:
    - Legitimate administrative activity
level: {attack['severity'].lower()}"""
            
            sigma_rule = {
                "id": str(uuid.uuid4()),
                "attack_id": attack['id'],
                "rule_name": f"{attack['name'].replace(' ', '_')}_Sigma",
                "rule_content": sigma_rule_content
            }
            await db.sigma_rules.insert_one(sigma_rule)
            
    except Exception as e:
        logging.error(f"Error generating rules for attack: {e}")

async def generate_rules(attack: AttackProfile, sec_solutions: List[str]):
    try:
        yara_rule_content = f"""rule {attack.name.replace(' ', '_')}_Detection
{{
    meta:
        description = "{attack.description}"
        severity = "{attack.severity}"
        threat_actor = "{attack.threat_actor or 'Unknown'}"
        source = "{attack.source_url}"
        mitre_tactics = "{', '.join(attack.mitre_tactics)}"
    
    strings:
        $ioc1 = "{attack.iocs[0] if attack.iocs else 'malicious_indicator'}"
        $ttp1 = "{attack.ttps[0] if attack.ttps else 'suspicious_behavior'}"
    
    condition:
        any of them
}}"""
        
        yara_rule = {
            "id": str(uuid.uuid4()),
            "attack_id": attack.id,
            "rule_name": f"{attack.name.replace(' ', '_')}_Yara",
            "rule_content": yara_rule_content
        }
        await db.yara_rules.insert_one(yara_rule)
        
        mitre_tag = attack.mitre_tactics[0].lower().replace(' ', '_') if attack.mitre_tactics and len(attack.mitre_tactics) > 0 else 'unknown'
        sigma_rule_content = f"""title: {attack.name} Detection
id: {str(uuid.uuid4())}
status: experimental
description: Detects {attack.description}
author: Intellisecure AI
date: {datetime.now(timezone.utc).strftime('%Y/%m/%d')}
references:
    - {attack.source_url}
tags:
    - attack.{mitre_tag}
logsource:
    category: process_creation
    product: windows
detection:
    selection:
        CommandLine|contains:
            - '{attack.iocs[0] if attack.iocs else 'malicious'}'
            - '{attack.ttps[0] if attack.ttps else 'suspicious'}'
    condition: selection
falsepositives:
    - Legitimate administrative activity
level: {attack.severity.lower()}"""
        
        sigma_rule = {
            "id": str(uuid.uuid4()),
            "attack_id": attack.id,
            "rule_name": f"{attack.name.replace(' ', '_')}_Sigma",
            "rule_content": sigma_rule_content
        }
        await db.sigma_rules.insert_one(sigma_rule)
        
    except Exception as e:
        logging.error(f"Error generating rules: {e}")

async def run_background_tasks():
    while True:
        try:
            await scrape_threat_feeds()
            await asyncio.sleep(10)
            await analyze_with_llm()
            await asyncio.sleep(300)
        except Exception as e:
            logging.error(f"Error in background tasks: {e}")
            await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    asyncio.create_task(run_background_tasks())

# ==================== ROOT & HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Intellisecure API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()