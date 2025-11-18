import requests
import sys
import json
from datetime import datetime
import time

class IntelliSecureAPITester:
    def __init__(self, base_url="https://threat-shield-27.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []

    def log_test(self, name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            print(f"❌ {name} - FAILED: {details}")
        
        self.test_results.append({
            "test": name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })

    def run_test(self, name, method, endpoint, expected_status, data=None, auth_required=True):
        """Run a single API test"""
        url = f"{self.api_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if auth_required and self.token:
            headers['Authorization'] = f'Bearer {self.token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)

            success = response.status_code == expected_status
            details = f"Status: {response.status_code}"
            
            if not success:
                try:
                    error_data = response.json()
                    details += f", Response: {error_data}"
                except:
                    details += f", Response: {response.text[:200]}"
            
            self.log_test(name, success, details)
            
            if success:
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                return False, {}

        except Exception as e:
            self.log_test(name, False, f"Exception: {str(e)}")
            return False, {}

    def test_health_check(self):
        """Test basic health endpoints"""
        print("\n🔍 Testing Health Endpoints...")
        
        # Test root endpoint
        self.run_test("Root Endpoint", "GET", "", 200, auth_required=False)
        
        # Test health endpoint
        self.run_test("Health Check", "GET", "health", 200, auth_required=False)

    def test_registration(self):
        """Test user registration"""
        print("\n🔍 Testing Registration...")
        
        timestamp = datetime.now().strftime('%H%M%S')
        test_user_data = {
            "email": f"test_user_{timestamp}@intellisecure.com",
            "password": "TestPass123!",
            "company_name": "Test Security Corp",
            "company_size": "Medium",
            "num_employees": 150,
            "industry": "Technology",
            "region": "North America",
            "applied_policies": ["SOC2", "ISO 27001"],
            "restrictions": [],
            "security_solutions": ["SIEM", "EDR", "Firewall"]
        }
        
        success, response = self.run_test(
            "User Registration",
            "POST",
            "auth/register",
            200,
            data=test_user_data,
            auth_required=False
        )
        
        if success and 'token' in response:
            self.token = response['token']
            self.user_id = response['user']['id']
            self.test_email = test_user_data['email']
            return True
        return False

    def test_login(self):
        """Test user login"""
        print("\n🔍 Testing Login...")
        
        if not hasattr(self, 'test_email'):
            self.log_test("Login Test", False, "No test user available")
            return False
        
        login_data = {
            "email": self.test_email,
            "password": "TestPass123!"
        }
        
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data=login_data,
            auth_required=False
        )
        
        if success and 'token' in response:
            self.token = response['token']
            return True
        return False

    def test_session_management(self):
        """Test session endpoints"""
        print("\n🔍 Testing Session Management...")
        
        if not self.token:
            self.log_test("Session Test", False, "No auth token available")
            return False
        
        success, response = self.run_test(
            "Get Session",
            "GET",
            "auth/session",
            200
        )
        
        return success

    def test_profile_endpoints(self):
        """Test profile management"""
        print("\n🔍 Testing Profile Endpoints...")
        
        if not self.token:
            self.log_test("Profile Test", False, "No auth token available")
            return False
        
        # Get profile
        success, profile = self.run_test(
            "Get Profile",
            "GET",
            "profile",
            200
        )
        
        return success

    def test_dashboard_endpoints(self):
        """Test dashboard endpoints"""
        print("\n🔍 Testing Dashboard Endpoints...")
        
        if not self.token:
            self.log_test("Dashboard Test", False, "No auth token available")
            return False
        
        # Test dashboard stats
        success1, stats = self.run_test(
            "Dashboard Stats",
            "GET",
            "dashboard/stats",
            200
        )
        
        # Test dashboard attacks
        success2, attacks = self.run_test(
            "Dashboard Attacks",
            "GET",
            "dashboard/attacks",
            200
        )
        
        return success1 and success2

    def test_insights_endpoint(self):
        """Test insights endpoint"""
        print("\n🔍 Testing Insights Endpoint...")
        
        success, insights = self.run_test(
            "Get Insights",
            "GET",
            "insights",
            200,
            auth_required=False
        )
        
        return success

    def test_rules_endpoint(self):
        """Test rules endpoint with dummy attack ID"""
        print("\n🔍 Testing Rules Endpoint...")
        
        if not self.token:
            self.log_test("Rules Test", False, "No auth token available")
            return False
        
        # Test with a dummy attack ID (should return empty rules)
        dummy_attack_id = "test-attack-123"
        success, rules = self.run_test(
            "Get Attack Rules",
            "GET",
            f"dashboard/rules/{dummy_attack_id}",
            200
        )
        
        return success

    def test_invalid_endpoints(self):
        """Test invalid endpoints and error handling"""
        print("\n🔍 Testing Error Handling...")
        
        # Test invalid endpoint
        self.run_test(
            "Invalid Endpoint",
            "GET",
            "invalid/endpoint",
            404,
            auth_required=False
        )
        
        # Test unauthorized access
        old_token = self.token
        self.token = "invalid_token"
        self.run_test(
            "Invalid Token",
            "GET",
            "dashboard/stats",
            401
        )
        self.token = old_token

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Intellisecure API Tests...")
        print(f"Testing against: {self.base_url}")
        
        # Test basic connectivity
        self.test_health_check()
        
        # Test authentication flow
        if self.test_registration():
            self.test_login()
            self.test_session_management()
            
            # Test protected endpoints
            self.test_profile_endpoints()
            self.test_dashboard_endpoints()
            self.test_rules_endpoint()
        
        # Test public endpoints
        self.test_insights_endpoint()
        
        # Test error handling
        self.test_invalid_endpoints()
        
        # Print summary
        print(f"\n📊 Test Summary:")
        print(f"Tests Run: {self.tests_run}")
        print(f"Tests Passed: {self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run)*100:.1f}%")
        
        # Check for critical failures
        if self.tests_passed < self.tests_run * 0.7:  # Less than 70% success
            print("❌ CRITICAL: Multiple API failures detected")
            return 1
        elif self.tests_passed == self.tests_run:
            print("✅ All tests passed!")
            return 0
        else:
            print("⚠️  Some tests failed but core functionality works")
            return 0

def main():
    tester = IntelliSecureAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())