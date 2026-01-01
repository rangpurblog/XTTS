#!/usr/bin/env python3
"""
Voice Cloning Platform Backend API Test Suite
Tests all endpoints including user auth, admin auth, plans, orders, voices, etc.
"""

import requests
import sys
import json
import time
from datetime import datetime

class VoiceCloneAPITester:
    def __init__(self, base_url="https://voicecraft-43.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.user_token = None
        self.admin_token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.test_results = []
        
        # Test credentials
        self.test_user = {
            "email": "test@example.com",
            "password": "test123",
            "name": "Test User"
        }
        
        self.admin_creds = {
            "email": "admin@voiceclone.com",
            "password": "admin123",
            "secret_key": "admin_super_secret_key"
        }

    def log_test(self, name, success, details="", endpoint=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name} - {details}")
        
        self.test_results.append({
            "name": name,
            "success": success,
            "details": details,
            "endpoint": endpoint
        })

    def make_request(self, method, endpoint, data=None, headers=None, files=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        
        if headers:
            default_headers.update(headers)
        
        if files:
            # Remove Content-Type for file uploads
            default_headers.pop('Content-Type', None)
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=default_headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, data=data, files=files, headers=default_headers)
                else:
                    response = requests.post(url, json=data, headers=default_headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=default_headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=default_headers)
            
            return response
        except Exception as e:
            print(f"Request error: {str(e)}")
            return None

    def get_auth_headers(self, admin=False):
        """Get authorization headers"""
        token = self.admin_token if admin else self.user_token
        return {'Authorization': f'Bearer {token}'} if token else {}

    def test_user_registration(self):
        """Test user registration"""
        response = self.make_request('POST', 'auth/register', self.test_user)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data and 'user' in data:
                self.user_token = data['token']
                self.log_test("User Registration", True, endpoint="auth/register")
                return True
        
        self.log_test("User Registration", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "auth/register")
        return False

    def test_user_login(self):
        """Test user login"""
        login_data = {
            "email": self.test_user["email"],
            "password": self.test_user["password"]
        }
        
        response = self.make_request('POST', 'auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data:
                self.user_token = data['token']
                self.log_test("User Login", True, endpoint="auth/login")
                return True
        
        self.log_test("User Login", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "auth/login")
        return False

    def test_user_profile(self):
        """Test getting user profile"""
        headers = self.get_auth_headers()
        response = self.make_request('GET', 'auth/me', headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'email' in data and data['email'] == self.test_user['email']:
                self.log_test("User Profile", True, endpoint="auth/me")
                return True
        
        self.log_test("User Profile", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "auth/me")
        return False

    def test_admin_login(self):
        """Test admin login"""
        response = self.make_request('POST', 'admin/auth/login', self.admin_creds)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'token' in data:
                self.admin_token = data['token']
                self.log_test("Admin Login", True, endpoint="admin/auth/login")
                return True
        
        self.log_test("Admin Login", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "admin/auth/login")
        return False

    def test_get_plans(self):
        """Test getting public plans"""
        response = self.make_request('GET', 'plans')
        
        if response and response.status_code == 200:
            plans = response.json()
            if isinstance(plans, list):
                self.log_test("Get Plans", True, f"Found {len(plans)} plans", "plans")
                return plans
        
        self.log_test("Get Plans", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "plans")
        return []

    def test_seed_plans(self):
        """Test seeding default plans"""
        headers = self.get_auth_headers(admin=True)
        response = self.make_request('POST', 'admin/seed-plans', {}, headers=headers)
        
        if response and response.status_code == 200:
            self.log_test("Seed Plans", True, endpoint="admin/seed-plans")
            return True
        
        self.log_test("Seed Plans", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "admin/seed-plans")
        return False

    def test_admin_stats(self):
        """Test admin stats endpoint"""
        headers = self.get_auth_headers(admin=True)
        response = self.make_request('GET', 'admin/stats', headers=headers)
        
        if response and response.status_code == 200:
            stats = response.json()
            if 'total_users' in stats:
                self.log_test("Admin Stats", True, endpoint="admin/stats")
                return True
        
        self.log_test("Admin Stats", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "admin/stats")
        return False

    def test_get_users(self):
        """Test admin get users"""
        headers = self.get_auth_headers(admin=True)
        response = self.make_request('GET', 'admin/users', headers=headers)
        
        if response and response.status_code == 200:
            data = response.json()
            if 'users' in data:
                self.log_test("Get Users", True, f"Found {len(data['users'])} users", "admin/users")
                return True
        
        self.log_test("Get Users", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "admin/users")
        return False

    def test_create_order(self, plans):
        """Test creating an order"""
        if not plans:
            self.log_test("Create Order", False, "No plans available", "orders")
            return None
        
        headers = self.get_auth_headers()
        order_data = {
            "plan_id": plans[0]['id'],
            "payment_method": "Bkash",
            "transaction_id": f"TXN{int(time.time())}"
        }
        
        response = self.make_request('POST', 'orders', order_data, headers=headers)
        
        if response and response.status_code == 200:
            order = response.json()
            if 'id' in order:
                self.log_test("Create Order", True, endpoint="orders")
                return order
        
        self.log_test("Create Order", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "orders")
        return None

    def test_get_orders(self):
        """Test getting user orders"""
        headers = self.get_auth_headers()
        response = self.make_request('GET', 'orders', headers=headers)
        
        if response and response.status_code == 200:
            orders = response.json()
            if isinstance(orders, list):
                self.log_test("Get Orders", True, f"Found {len(orders)} orders", "orders")
                return orders
        
        self.log_test("Get Orders", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "orders")
        return []

    def test_admin_orders(self):
        """Test admin get orders"""
        headers = self.get_auth_headers(admin=True)
        response = self.make_request('GET', 'admin/orders', headers=headers)
        
        if response and response.status_code == 200:
            orders = response.json()
            if isinstance(orders, list):
                self.log_test("Admin Get Orders", True, f"Found {len(orders)} orders", "admin/orders")
                return orders
        
        self.log_test("Admin Get Orders", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "admin/orders")
        return []

    def test_approve_order(self, orders):
        """Test approving an order"""
        if not orders:
            self.log_test("Approve Order", False, "No orders to approve", "admin/orders/approve")
            return False
        
        # Find a pending order
        pending_order = None
        for order in orders:
            if order.get('status') == 'pending':
                pending_order = order
                break
        
        if not pending_order:
            self.log_test("Approve Order", False, "No pending orders found", "admin/orders/approve")
            return False
        
        headers = self.get_auth_headers(admin=True)
        response = self.make_request('POST', f'admin/orders/{pending_order["id"]}/approve', {}, headers=headers)
        
        if response and response.status_code == 200:
            self.log_test("Approve Order", True, endpoint=f"admin/orders/{pending_order['id']}/approve")
            return True
        
        self.log_test("Approve Order", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     f"admin/orders/{pending_order['id']}/approve")
        return False

    def test_get_voices(self):
        """Test getting user voices"""
        headers = self.get_auth_headers()
        response = self.make_request('GET', 'voices/my', headers=headers)
        
        if response and response.status_code == 200:
            voices = response.json()
            if isinstance(voices, list):
                self.log_test("Get My Voices", True, f"Found {len(voices)} voices", "voices/my")
                return voices
        
        self.log_test("Get My Voices", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "voices/my")
        return []

    def test_get_public_voices(self):
        """Test getting public voices"""
        response = self.make_request('GET', 'voices/public')
        
        if response and response.status_code == 200:
            voices = response.json()
            if isinstance(voices, list):
                self.log_test("Get Public Voices", True, f"Found {len(voices)} voices", "voices/public")
                return voices
        
        self.log_test("Get Public Voices", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "voices/public")
        return []

    def test_payment_accounts(self):
        """Test getting payment accounts"""
        response = self.make_request('GET', 'payment-accounts')
        
        if response and response.status_code == 200:
            accounts = response.json()
            if isinstance(accounts, list):
                self.log_test("Get Payment Accounts", True, f"Found {len(accounts)} accounts", "payment-accounts")
                return accounts
        
        self.log_test("Get Payment Accounts", False, 
                     f"Status: {response.status_code if response else 'No response'}", 
                     "payment-accounts")
        return []

    def test_admin_payment_accounts(self):
        """Test admin payment accounts management"""
        headers = self.get_auth_headers(admin=True)
        
        # Get existing accounts
        response = self.make_request('GET', 'admin/payment-accounts', headers=headers)
        if response and response.status_code == 200:
            self.log_test("Admin Get Payment Accounts", True, endpoint="admin/payment-accounts")
        else:
            self.log_test("Admin Get Payment Accounts", False, 
                         f"Status: {response.status_code if response else 'No response'}", 
                         "admin/payment-accounts")
            return False
        
        # Create a test payment account
        account_data = {
            "method": "Test Bkash",
            "account_number": "01700000000",
            "account_name": "Test Account",
            "is_active": True
        }
        
        response = self.make_request('POST', 'admin/payment-accounts', account_data, headers=headers)
        if response and response.status_code == 200:
            account = response.json()
            self.log_test("Create Payment Account", True, endpoint="admin/payment-accounts")
            
            # Delete the test account
            if 'id' in account:
                delete_response = self.make_request('DELETE', f'admin/payment-accounts/{account["id"]}', headers=headers)
                if delete_response and delete_response.status_code == 200:
                    self.log_test("Delete Payment Account", True, endpoint=f"admin/payment-accounts/{account['id']}")
                else:
                    self.log_test("Delete Payment Account", False, 
                                 f"Status: {delete_response.status_code if delete_response else 'No response'}", 
                                 f"admin/payment-accounts/{account['id']}")
            return True
        else:
            self.log_test("Create Payment Account", False, 
                         f"Status: {response.status_code if response else 'No response'}", 
                         "admin/payment-accounts")
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Voice Cloning Platform API Tests")
        print(f"📡 Testing against: {self.base_url}")
        print("=" * 60)
        
        # Test user authentication
        print("\n👤 Testing User Authentication...")
        if not self.test_user_registration():
            # If registration fails, try login
            self.test_user_login()
        
        if self.user_token:
            self.test_user_profile()
        
        # Test admin authentication
        print("\n🔐 Testing Admin Authentication...")
        self.test_admin_login()
        
        # Test plans
        print("\n📋 Testing Plans...")
        plans = self.test_get_plans()
        
        if self.admin_token:
            if not plans:  # If no plans exist, seed them
                self.test_seed_plans()
                plans = self.test_get_plans()
        
        # Test admin features
        if self.admin_token:
            print("\n⚙️ Testing Admin Features...")
            self.test_admin_stats()
            self.test_get_users()
            self.test_admin_payment_accounts()
        
        # Test orders
        if self.user_token and plans:
            print("\n🛒 Testing Orders...")
            order = self.test_create_order(plans)
            orders = self.test_get_orders()
            
            if self.admin_token:
                admin_orders = self.test_admin_orders()
                if admin_orders:
                    self.test_approve_order(admin_orders)
        
        # Test voices
        print("\n🎤 Testing Voices...")
        self.test_get_voices()
        self.test_get_public_voices()
        
        # Test payment accounts
        print("\n💳 Testing Payment Accounts...")
        self.test_payment_accounts()
        
        # Print results
        print("\n" + "=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.tests_passed == self.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print("❌ Some tests failed!")
            print("\nFailed tests:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['name']}: {result['details']}")
            return 1

def main():
    """Main test runner"""
    tester = VoiceCloneAPITester()
    return tester.run_all_tests()

if __name__ == "__main__":
    sys.exit(main())