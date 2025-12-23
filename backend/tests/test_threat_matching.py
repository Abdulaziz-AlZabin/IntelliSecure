import requests
import sys
import json
import time
import asyncio
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorClient
import os

class ThreatMatchingTester:
    def __init__(self, base_url="https://intellisecure-1.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.test_results = []
        self.mongo_client = None
        self.db = None
        
    async def setup_db_connection(self):
        """Setup MongoDB connection for direct database verification"""
        try:
            mongo_url = "mongodb://localhost:27017"
            self.mongo_client = AsyncIOMotorClient(mongo_url)
            self.db = self.mongo_client["intellisecure_db"]
            print("✅ Database connection established")
            return True
        except Exception as e:
            print(f"❌ Database connection failed: {e}")
            return False

    def log_result(self, test_name, success, details="", data=None):
        """Log test result with detailed information"""
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{status} - {test_name}")
        if details:
            print(f"   Details: {details}")
        if data and not success:
            print(f"   Data: {json.dumps(data, indent=2)}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "data": data,
            "timestamp": datetime.now().isoformat()
        })

    async def verify_database_collections(self):
        """Step 1: Verify database collections and existing data"""
        print("\n🔍 Step 1: Database Verification")
        
        try:
            # Check attacks collection
            attacks_count = await self.db.attacks.count_documents({})
            print(f"   Attacks collection: {attacks_count} documents")
            
            # Check scraped_data collection
            scraped_count = await self.db.scraped_data.count_documents({})
            unprocessed_count = await self.db.scraped_data.count_documents({"processed": False})
            print(f"   Scraped data: {scraped_count} total, {unprocessed_count} unprocessed")
            
            # Check profiles collection
            profiles_count = await self.db.profiles.count_documents({})
            print(f"   Profiles collection: {profiles_count} documents")
            
            # Check user_attacks collection
            user_attacks_count = await self.db.user_attacks.count_documents({})
            print(f"   User attacks collection: {user_attacks_count} documents")
            
            # Sample some attacks to see their structure
            sample_attacks = await self.db.attacks.find({}, {"_id": 0}).limit(3).to_list(3)
            print(f"   Sample attacks found: {len(sample_attacks)}")
            for i, attack in enumerate(sample_attacks):
                print(f"     Attack {i+1}: {attack.get('name', 'Unknown')} - Industry: {attack.get('tags', {}).get('industries', [])} - Region: {attack.get('tags', {}).get('regions', [])}")
            
            self.log_result("Database Collections Verification", True, 
                          f"Attacks: {attacks_count}, Scraped: {scraped_count}, Profiles: {profiles_count}, User-Attacks: {user_attacks_count}")
            
            return attacks_count > 0
            
        except Exception as e:
            self.log_result("Database Collections Verification", False, f"Error: {e}")
            return False

    def register_new_user(self):
        """Step 2: Register new user with specific profile"""
        print("\n🔍 Step 2: New User Registration")
        
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "email": f"test@security.com",
            "password": "TestPass123",
            "company_name": "Security Corp",
            "company_size": "Medium",
            "num_employees": 150,
            "industry": "Finance",
            "region": "North America",
            "applied_policies": ["ISO 27001"],
            "restrictions": ["GDPR"],
            "security_solutions": ["SIEM", "EDR"]
        }
        
        try:
            response = requests.post(
                f"{self.api_url}/auth/register",
                json=test_user_data,
                headers={'Content-Type': 'application/json'},
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('token')
                self.user_id = data.get('user', {}).get('id')
                self.test_email = test_user_data['email']
                
                self.log_result("User Registration", True, 
                              f"User ID: {self.user_id}, Email: {self.test_email}")
                return True
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result("User Registration", False, 
                              f"Status: {response.status_code}, Response: {error_data}")
                return False
                
        except Exception as e:
            self.log_result("User Registration", False, f"Exception: {e}")
            return False

    async def verify_profile_creation(self):
        """Step 3: Verify profile was created in database"""
        print("\n🔍 Step 3: Profile Creation Verification")
        
        try:
            profile = await self.db.profiles.find_one({"user_id": self.user_id}, {"_id": 0})
            
            if profile:
                print(f"   Profile found for user: {self.user_id}")
                print(f"   Company: {profile.get('company_name')}")
                print(f"   Industry: {profile.get('industry')}")
                print(f"   Region: {profile.get('region')}")
                print(f"   Security Solutions: {profile.get('security_solutions')}")
                print(f"   Tags: {profile.get('tags')}")
                
                self.log_result("Profile Creation", True, 
                              f"Profile created with industry: {profile.get('industry')}, region: {profile.get('region')}")
                return profile
            else:
                self.log_result("Profile Creation", False, "Profile not found in database")
                return None
                
        except Exception as e:
            self.log_result("Profile Creation", False, f"Error: {e}")
            return None

    async def wait_for_background_task(self):
        """Step 4: Wait for background matching task to complete"""
        print("\n🔍 Step 4: Waiting for Background Task Completion")
        
        print("   Waiting 10 seconds for background task to complete...")
        await asyncio.sleep(10)
        
        # Check if any user_attacks were created for our user
        try:
            user_attacks = await self.db.user_attacks.find({"user_id": self.user_id}, {"_id": 0}).to_list(100)
            
            print(f"   Found {len(user_attacks)} matched attacks for user")
            for attack in user_attacks[:3]:  # Show first 3
                print(f"     - {attack.get('name')} (Severity: {attack.get('severity')})")
            
            self.log_result("Background Task Completion", len(user_attacks) > 0, 
                          f"Matched attacks found: {len(user_attacks)}")
            
            return user_attacks
            
        except Exception as e:
            self.log_result("Background Task Completion", False, f"Error: {e}")
            return []

    async def analyze_matching_logic(self, profile):
        """Step 5: Analyze why matching might not be working"""
        print("\n🔍 Step 5: Matching Logic Analysis")
        
        try:
            # Get all attacks from database
            all_attacks = await self.db.attacks.find({}, {"_id": 0}).to_list(1000)
            print(f"   Total attacks in database: {len(all_attacks)}")
            
            if len(all_attacks) == 0:
                self.log_result("Matching Logic Analysis", False, "No attacks found in database")
                return False
            
            # Analyze matching criteria
            user_industry = profile.get('tags', {}).get('industry')
            user_region = profile.get('tags', {}).get('region')
            user_solutions = profile.get('tags', {}).get('sec_solutions', [])
            
            print(f"   User profile - Industry: {user_industry}, Region: {user_region}, Solutions: {user_solutions}")
            
            matching_attacks = []
            for attack in all_attacks:
                match_score = 0
                attack_industries = attack.get('tags', {}).get('industries', [])
                attack_regions = attack.get('tags', {}).get('regions', [])
                attack_solutions = attack.get('tags', {}).get('sec_solutions', [])
                
                # Check industry match
                if user_industry in attack_industries or 'Global' in attack_industries:
                    match_score += 1
                
                # Check region match
                if user_region in attack_regions or 'Global' in attack_regions:
                    match_score += 1
                
                # Check security solutions match
                for solution in user_solutions:
                    if solution in attack_solutions or 'All' in attack_solutions:
                        match_score += 1
                        break
                
                if match_score >= 2:
                    matching_attacks.append({
                        'name': attack.get('name'),
                        'score': match_score,
                        'industries': attack_industries,
                        'regions': attack_regions,
                        'solutions': attack_solutions
                    })
            
            print(f"   Attacks that should match (score >= 2): {len(matching_attacks)}")
            for attack in matching_attacks[:5]:  # Show first 5
                print(f"     - {attack['name']} (Score: {attack['score']})")
                print(f"       Industries: {attack['industries']}")
                print(f"       Regions: {attack['regions']}")
                print(f"       Solutions: {attack['solutions']}")
            
            self.log_result("Matching Logic Analysis", len(matching_attacks) > 0, 
                          f"Expected matches: {len(matching_attacks)}")
            
            return matching_attacks
            
        except Exception as e:
            self.log_result("Matching Logic Analysis", False, f"Error: {e}")
            return []

    def test_dashboard_api(self):
        """Step 6: Test dashboard API endpoint"""
        print("\n🔍 Step 6: Dashboard API Test")
        
        if not self.token:
            self.log_result("Dashboard API Test", False, "No authentication token available")
            return False
        
        try:
            response = requests.get(
                f"{self.api_url}/dashboard/attacks",
                headers={
                    'Authorization': f'Bearer {self.token}',
                    'Content-Type': 'application/json'
                },
                timeout=30
            )
            
            if response.status_code == 200:
                attacks = response.json()
                print(f"   Dashboard API returned {len(attacks)} attacks")
                
                for attack in attacks[:3]:  # Show first 3
                    print(f"     - {attack.get('name')} (Severity: {attack.get('severity')})")
                
                self.log_result("Dashboard API Test", True, 
                              f"API returned {len(attacks)} attacks")
                return attacks
            else:
                error_data = response.json() if response.headers.get('content-type', '').startswith('application/json') else response.text
                self.log_result("Dashboard API Test", False, 
                              f"Status: {response.status_code}, Response: {error_data}")
                return []
                
        except Exception as e:
            self.log_result("Dashboard API Test", False, f"Exception: {e}")
            return []

    async def verify_background_scraping(self):
        """Step 7: Verify background scraping is working"""
        print("\n🔍 Step 7: Background Scraping Verification")
        
        try:
            # Check if new scraped data is being added
            initial_count = await self.db.scraped_data.count_documents({})
            print(f"   Initial scraped data count: {initial_count}")
            
            # Wait a bit and check again
            print("   Waiting 30 seconds to check for new scraped data...")
            await asyncio.sleep(30)
            
            final_count = await self.db.scraped_data.count_documents({})
            print(f"   Final scraped data count: {final_count}")
            
            new_entries = final_count - initial_count
            
            # Check recent entries
            recent_entries = await self.db.scraped_data.find({}).sort("_id", -1).limit(5).to_list(5)
            print(f"   Recent scraped entries: {len(recent_entries)}")
            
            for entry in recent_entries:
                print(f"     - {entry.get('title', 'Unknown')[:50]}... (Processed: {entry.get('processed', False)})")
            
            self.log_result("Background Scraping", new_entries > 0 or initial_count > 0, 
                          f"New entries: {new_entries}, Total: {final_count}")
            
            return final_count > 0
            
        except Exception as e:
            self.log_result("Background Scraping", False, f"Error: {e}")
            return False

    async def run_comprehensive_test(self):
        """Run the complete threat matching test sequence"""
        print("🚀 Starting Comprehensive Threat Matching Test")
        print(f"Testing against: {self.base_url}")
        
        # Setup database connection
        if not await self.setup_db_connection():
            return False
        
        try:
            # Step 1: Database verification
            has_attacks = await self.verify_database_collections()
            
            # Step 2: Register new user
            if not self.register_new_user():
                return False
            
            # Step 3: Verify profile creation
            profile = await self.verify_profile_creation()
            if not profile:
                return False
            
            # Step 4: Wait for background task
            user_attacks = await self.wait_for_background_task()
            
            # Step 5: Analyze matching logic
            expected_matches = await self.analyze_matching_logic(profile)
            
            # Step 6: Test dashboard API
            api_attacks = self.test_dashboard_api()
            
            # Step 7: Verify background scraping
            await self.verify_background_scraping()
            
            # Final analysis
            print("\n📊 Final Analysis:")
            print(f"   Database has attacks: {has_attacks}")
            print(f"   Expected matches: {len(expected_matches) if expected_matches else 0}")
            print(f"   Actual user_attacks in DB: {len(user_attacks)}")
            print(f"   Dashboard API returned: {len(api_attacks) if api_attacks else 0}")
            
            # Determine root cause
            if not has_attacks:
                root_cause = "No attacks in database - scraping/analysis not working"
            elif len(expected_matches) == 0:
                root_cause = "No attacks match user profile criteria"
            elif len(user_attacks) == 0:
                root_cause = "Matching logic not executing or failing"
            elif len(api_attacks) == 0:
                root_cause = "Dashboard API not returning matched attacks"
            else:
                root_cause = "System working correctly"
            
            print(f"   Root cause: {root_cause}")
            
            return len(api_attacks) > 0 if api_attacks else False
            
        finally:
            if self.mongo_client:
                self.mongo_client.close()

    def print_summary(self):
        """Print test summary"""
        print("\n📋 Test Summary:")
        passed = sum(1 for result in self.test_results if result['success'])
        total = len(self.test_results)
        
        print(f"Tests run: {total}")
        print(f"Tests passed: {passed}")
        print(f"Success rate: {(passed/total)*100:.1f}%" if total > 0 else "0%")
        
        print("\nDetailed Results:")
        for result in self.test_results:
            status = "✅" if result['success'] else "❌"
            print(f"{status} {result['test']}: {result['details']}")

async def main():
    tester = ThreatMatchingTester()
    success = await tester.run_comprehensive_test()
    tester.print_summary()
    return 0 if success else 1

if __name__ == "__main__":
    import asyncio
    sys.exit(asyncio.run(main()))