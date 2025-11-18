from fastapi import FastAPI, APIRouter, HTTPException, Depends, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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
    company_size: str  # Small, Medium, Large, Enterprise
    num_employees: int
    industry: str
    region: str
    applied_policies: List[str]
    restrictions: List[str]
    security_solutions: List[str]  # SIEM, EDR, IDS/IPS, Firewall

class UserLogin(BaseModel):
    email: EmailStr
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
    tags: Dict[str, Any]  # {"industry": str, "region": str, "sec_solutions": List[str]}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class AttackProfile(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    iocs: List[str]  # Indicators of Compromise
    ttps: List[str]  # Tactics, Techniques, and Procedures
    tags: Dict[str, Any]  # {"industries": List[str], "regions": List[str], "sec_solutions": List[str]}
    source_url: str
    severity: str  # Low, Medium, High, Critical
    discovered_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class YaraRule(BaseModel):
    attack_id: str
    rule_name: str
    rule_content: str

class SigmaRule(BaseModel):
    attack_id: str
    rule_name: str
    rule_content: str

class ThreatIntel(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    summary: str
    url: str
    published_at: datetime
    source: str

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
async def register(user_data: UserRegister):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    user = User(
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    user_dict = user.model_dump()
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    await db.users.insert_one(user_dict)
    
    # Create company profile
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
    
    # Generate JWT token
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
    
    # Get matched attacks for this user
    matched_attacks = await db.user_attacks.find({"user_id": current_user["id"]}, {"_id": 0}).to_list(1000)
    
    # Calculate stats
    total_threats = len(matched_attacks)
    critical_threats = len([a for a in matched_attacks if a.get("severity") == "Critical"])
    high_threats = len([a for a in matched_attacks if a.get("severity") == "High"])
    medium_threats = len([a for a in matched_attacks if a.get("severity") == "Medium"])
    
    return {
        "total_threats": total_threats,
        "critical_threats": critical_threats,
        "high_threats": high_threats,
        "medium_threats": medium_threats,
        "industry": profile["industry"],
        "region": profile["region"]
    }

@api_router.get("/dashboard/attacks")
async def get_attacks(current_user: dict = Depends(get_current_user)):
    # Get matched attacks
    matched_attacks = await db.user_attacks.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).sort("discovered_at", -1).limit(20).to_list(20)
    
    return matched_attacks

@api_router.get("/dashboard/rules/{attack_id}")
async def get_attack_rules(attack_id: str, current_user: dict = Depends(get_current_user)):
    # Get Yara rules
    yara_rules = await db.yara_rules.find({"attack_id": attack_id}, {"_id": 0}).to_list(100)
    
    # Get Sigma rules
    sigma_rules = await db.sigma_rules.find({"attack_id": attack_id}, {"_id": 0}).to_list(100)
    
    return {
        "yara_rules": yara_rules,
        "sigma_rules": sigma_rules
    }

# ==================== INSIGHTS ENDPOINT ====================

@api_router.get("/insights")
async def get_insights():
    insights = await db.threat_intel.find({}, {"_id": 0}).sort("published_at", -1).limit(15).to_list(15)
    return insights

# ==================== WEB SCRAPING & LLM ANALYSIS ====================

THREAT_SOURCES = [
    "https://www.cisa.gov/news-events/cybersecurity-advisories",
    "https://feeds.feedburner.com/TheHackersNews",
    "https://www.bleepingcomputer.com/feed/",
    "https://www.darkreading.com/rss.xml"
]

async def scrape_threat_feeds():
    """Scrape threat intelligence from multiple sources"""
    try:
        async with aiohttp.ClientSession() as session:
            for source in THREAT_SOURCES:
                try:
                    # Parse RSS feed
                    feed = feedparser.parse(source)
                    
                    for entry in feed.entries[:5]:  # Limit to 5 per source
                        # Check if already processed
                        existing = await db.scraped_data.find_one({"url": entry.link})
                        if existing:
                            continue
                        
                        # Store scraped data
                        scraped_doc = {
                            "id": str(uuid.uuid4()),
                            "title": entry.title,
                            "url": entry.link,
                            "summary": entry.get('summary', '')[:500],
                            "source": source,
                            "published_at": datetime.now(timezone.utc).isoformat(),
                            "processed": False
                        }
                        await db.scraped_data.insert_one(scraped_doc)
                        
                        # Store in threat intel for insights
                        intel_doc = {
                            "id": str(uuid.uuid4()),
                            "title": entry.title,
                            "summary": entry.get('summary', '')[:300],
                            "url": entry.link,
                            "published_at": datetime.now(timezone.utc).isoformat(),
                            "source": source
                        }
                        await db.threat_intel.insert_one(intel_doc)
                        
                except Exception as e:
                    logging.error(f"Error scraping {source}: {e}")
                    continue
                    
    except Exception as e:
        logging.error(f"Error in scrape_threat_feeds: {e}")

async def analyze_with_llm():
    """Analyze scraped data with LLM to extract attack profiles"""
    try:
        # Get unprocessed articles
        unprocessed = await db.scraped_data.find({"processed": False}, {"_id": 0}).limit(3).to_list(3)
        
        if not unprocessed:
            return
        
        # Initialize LLM
        llm_key = os.environ['EMERGENT_LLM_KEY']
        chat = LlmChat(
            api_key=llm_key,
            session_id="threat_analysis",
            system_message="""You are a cybersecurity threat intelligence analyst. Analyze the given threat article and extract:
1. Attack name
2. Brief description
3. IOCs (Indicators of Compromise) - IPs, domains, file hashes, etc.
4. TTPs (Tactics, Techniques, Procedures)
5. Target industries (e.g., Finance, Healthcare, Technology, Government, Energy)
6. Target regions (e.g., North America, Europe, Asia, Global)
7. Affected security solutions (e.g., SIEM, EDR, IDS/IPS, Firewall)
8. Severity (Critical, High, Medium, Low)

Return ONLY a valid JSON object with this structure:
{
  "name": "attack name",
  "description": "brief description",
  "iocs": ["ioc1", "ioc2"],
  "ttps": ["ttp1", "ttp2"],
  "industries": ["industry1", "industry2"],
  "regions": ["region1", "region2"],
  "sec_solutions": ["solution1", "solution2"],
  "severity": "High"
}"""
        ).with_model("openai", "gpt-4o-mini")
        
        for article in unprocessed:
            try:
                # Prepare prompt
                prompt = f"""Analyze this cybersecurity threat article:

Title: {article['title']}
URL: {article['url']}
Summary: {article['summary']}

Extract threat intelligence in JSON format."""
                
                # Get LLM response
                message = UserMessage(text=prompt)
                response = await chat.send_message(message)
                
                # Parse JSON response
                json_match = re.search(r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}', response, re.DOTALL)
                if json_match:
                    attack_data = json.loads(json_match.group())
                    
                    # Create attack profile
                    attack = AttackProfile(
                        name=attack_data.get('name', article['title']),
                        description=attack_data.get('description', ''),
                        iocs=attack_data.get('iocs', []),
                        ttps=attack_data.get('ttps', []),
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
                    await db.attacks.insert_one(attack_dict)
                    
                    # Match with user profiles
                    await match_attacks_to_users(attack)
                    
                # Mark as processed
                await db.scraped_data.update_one(
                    {"id": article['id']},
                    {"$set": {"processed": True}}
                )
                
            except Exception as e:
                logging.error(f"Error analyzing article {article['id']}: {e}")
                # Mark as processed to avoid infinite retry
                await db.scraped_data.update_one(
                    {"id": article['id']},
                    {"$set": {"processed": True}}
                )
                continue
                
    except Exception as e:
        logging.error(f"Error in analyze_with_llm: {e}")

async def match_attacks_to_users(attack: AttackProfile):
    """Match attack profiles to user profiles based on tags"""
    try:
        # Get all profiles
        profiles = await db.profiles.find({}, {"_id": 0}).to_list(1000)
        
        for profile in profiles:
            # Check if tags match
            match_score = 0
            
            # Check industry match
            if profile['tags']['industry'] in attack.tags['industries'] or 'Global' in attack.tags['industries']:
                match_score += 1
            
            # Check region match
            if profile['tags']['region'] in attack.tags['regions'] or 'Global' in attack.tags['regions']:
                match_score += 1
            
            # Check security solutions match
            for solution in profile['tags']['sec_solutions']:
                if solution in attack.tags['sec_solutions'] or 'All' in attack.tags['sec_solutions']:
                    match_score += 1
                    break
            
            # If match score >= 2, link attack to user
            if match_score >= 2:
                # Check if already linked
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
                        "discovered_at": attack.discovered_at.isoformat(),
                        "linked_at": datetime.now(timezone.utc).isoformat()
                    }
                    await db.user_attacks.insert_one(user_attack)
                    
                    # Generate rules for this user's security solutions
                    await generate_rules(attack, profile['tags']['sec_solutions'])
                    
    except Exception as e:
        logging.error(f"Error in match_attacks_to_users: {e}")

async def generate_rules(attack: AttackProfile, sec_solutions: List[str]):
    """Generate Yara and Sigma rules for the attack"""
    try:
        # Generate Yara rule
        yara_rule_content = f"""rule {attack.name.replace(' ', '_')}_Detection
{{
    meta:
        description = "{attack.description}"
        severity = "{attack.severity}"
        source = "{attack.source_url}"
    
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
        
        # Generate Sigma rule
        sigma_rule_content = f"""title: {attack.name} Detection
id: {str(uuid.uuid4())}
status: experimental
description: Detects {attack.description}
author: Intellisecure AI
date: {datetime.now(timezone.utc).strftime('%Y/%m/%d')}
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
    - Unknown
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

# Background task runner
async def run_background_tasks():
    """Run scraping and analysis tasks periodically"""
    while True:
        try:
            await scrape_threat_feeds()
            await asyncio.sleep(10)  # Wait between scraping and analysis
            await analyze_with_llm()
            await asyncio.sleep(300)  # Run every 5 minutes
        except Exception as e:
            logging.error(f"Error in background tasks: {e}")
            await asyncio.sleep(60)

@app.on_event("startup")
async def startup_event():
    # Start background tasks
    asyncio.create_task(run_background_tasks())

# ==================== ROOT & HEALTH CHECK ====================

@api_router.get("/")
async def root():
    return {"message": "Intellisecure API is running"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy"}

# Include router
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