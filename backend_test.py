#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class KrishiAPITester:
    def __init__(self, base_url="https://farm-to-table-oils.preview.emergentagent.com"):
        self.base_url = base_url
        self.session = requests.Session()
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.admin_token = None
        self.user_token = None

    def log_test(self, name, success, response_data=None, error=None):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            self.failed_tests.append({
                "test": name,
                "error": str(error) if error else "Unknown error",
                "response": response_data
            })
            print(f"❌ {name} - {error}")

    def make_request(self, method, endpoint, data=None, headers=None, cookies=None):
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/api/{endpoint}"
        default_headers = {'Content-Type': 'application/json'}
        if headers:
            default_headers.update(headers)
        
        try:
            if method == 'GET':
                response = self.session.get(url, headers=default_headers, cookies=cookies)
            elif method == 'POST':
                response = self.session.post(url, json=data, headers=default_headers, cookies=cookies)
            elif method == 'PATCH':
                response = self.session.patch(url, json=data, headers=default_headers, cookies=cookies)
            
            return response
        except Exception as e:
            return None

    def test_health_check(self):
        """Test health endpoint"""
        response = self.make_request('GET', 'health')
        if response and response.status_code == 200:
            data = response.json()
            success = 'status' in data and data['status'] == 'healthy'
            self.log_test("Health Check", success, data)
            return success
        else:
            self.log_test("Health Check", False, error="Failed to connect or invalid response")
            return False

    def test_admin_login(self):
        """Test admin login"""
        login_data = {
            "email": "admin@krishi.com",
            "password": "admin123"
        }
        response = self.make_request('POST', 'auth/login', login_data)
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'id' in data and 'email' in data and data['role'] == 'admin'
            if success:
                # Store cookies for subsequent requests
                self.session.cookies.update(response.cookies)
            self.log_test("Admin Login", success, data)
            return success
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_data = response.json()
                    error_msg += f", Error: {error_data.get('detail', 'Unknown')}"
                except:
                    error_msg += f", Response: {response.text[:100]}"
            self.log_test("Admin Login", False, error=error_msg)
            return False

    def test_user_registration(self):
        """Test user registration"""
        timestamp = datetime.now().strftime("%H%M%S")
        reg_data = {
            "name": f"Test User {timestamp}",
            "email": f"testuser{timestamp}@example.com",
            "password": "test123",
            "phone": "9876543210"
        }
        response = self.make_request('POST', 'auth/register', reg_data)
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'id' in data and 'email' in data and data['role'] == 'user'
            self.log_test("User Registration", success, data)
            return success
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            if response:
                try:
                    error_data = response.json()
                    error_msg += f", Error: {error_data.get('detail', 'Unknown')}"
                except:
                    error_msg += f", Response: {response.text[:100]}"
            self.log_test("User Registration", False, error=error_msg)
            return False

    def test_auth_me(self):
        """Test get current user"""
        response = self.make_request('GET', 'auth/me')
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'id' in data and 'email' in data
            self.log_test("Get Current User", success, data)
            return success
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get Current User", False, error=error_msg)
            return False

    def test_products_api(self):
        """Test products endpoints"""
        # Test get all products
        response = self.make_request('GET', 'products')
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list) and len(data) > 0
            self.log_test("Get All Products", success, f"Found {len(data)} products")
            
            if success and len(data) > 0:
                # Test get specific product
                first_product = data[0]
                product_slug = first_product.get('slug')
                if product_slug:
                    response = self.make_request('GET', f'products/{product_slug}')
                    if response and response.status_code == 200:
                        product_data = response.json()
                        success = 'name' in product_data and 'price' in product_data
                        self.log_test("Get Specific Product", success, product_data.get('name'))
                        
                        # Test related products
                        response = self.make_request('GET', f'products/{product_slug}/related')
                        if response and response.status_code == 200:
                            related_data = response.json()
                            success = isinstance(related_data, list)
                            self.log_test("Get Related Products", success, f"Found {len(related_data)} related products")
                        else:
                            self.log_test("Get Related Products", False, error="Failed to fetch related products")
                    else:
                        self.log_test("Get Specific Product", False, error="Failed to fetch specific product")
            return True
        else:
            self.log_test("Get All Products", False, error="Failed to fetch products")
            return False

    def test_collections_api(self):
        """Test collections endpoints"""
        response = self.make_request('GET', 'collections')
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list) and len(data) > 0
            self.log_test("Get All Collections", success, f"Found {len(data)} collections")
            
            if success and len(data) > 0:
                # Test get specific collection
                first_collection = data[0]
                collection_slug = first_collection.get('slug')
                if collection_slug:
                    response = self.make_request('GET', f'collections/{collection_slug}')
                    if response and response.status_code == 200:
                        collection_data = response.json()
                        success = 'name' in collection_data and 'slug' in collection_data
                        self.log_test("Get Specific Collection", success, collection_data.get('name'))
                    else:
                        self.log_test("Get Specific Collection", False, error="Failed to fetch specific collection")
            return True
        else:
            self.log_test("Get All Collections", False, error="Failed to fetch collections")
            return False

    def test_bestsellers_api(self):
        """Test bestsellers endpoint"""
        response = self.make_request('GET', 'bestsellers')
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Get Bestsellers", success, f"Found {len(data)} bestsellers")
            return success
        else:
            self.log_test("Get Bestsellers", False, error="Failed to fetch bestsellers")
            return False

    def test_blog_api(self):
        """Test blog endpoints"""
        response = self.make_request('GET', 'blog')
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Get Blog Posts", success, f"Found {len(data)} blog posts")
            
            if success and len(data) > 0:
                # Test get specific blog post
                first_post = data[0]
                post_slug = first_post.get('slug')
                if post_slug:
                    response = self.make_request('GET', f'blog/{post_slug}')
                    if response and response.status_code == 200:
                        post_data = response.json()
                        success = 'title' in post_data and 'content' in post_data
                        self.log_test("Get Specific Blog Post", success, post_data.get('title'))
                    else:
                        self.log_test("Get Specific Blog Post", False, error="Failed to fetch specific blog post")
            return True
        else:
            self.log_test("Get Blog Posts", False, error="Failed to fetch blog posts")
            return False

    def test_cart_api(self):
        """Test cart endpoints (requires authentication)"""
        # Test get cart
        response = self.make_request('GET', 'cart')
        if response and response.status_code == 200:
            data = response.json()
            success = 'items' in data and 'total' in data
            self.log_test("Get Cart", success, data)
            
            # Test add to cart
            add_item_data = {
                "product_id": "groundnut-oil",
                "quantity": 1,
                "size": "500ml",
                "is_subscription": False
            }
            response = self.make_request('POST', 'cart/add', add_item_data)
            if response and response.status_code == 200:
                cart_data = response.json()
                success = 'items' in cart_data and len(cart_data['items']) > 0
                self.log_test("Add to Cart", success, cart_data)
            else:
                error_msg = f"Status: {response.status_code if response else 'No response'}"
                self.log_test("Add to Cart", False, error=error_msg)
            return True
        else:
            self.log_test("Get Cart", False, error="Failed to fetch cart")
            return False

    def test_contact_api(self):
        """Test contact form submission"""
        contact_data = {
            "name": "Test User",
            "email": "test@example.com",
            "phone": "9876543210",
            "message": "This is a test message from automated testing."
        }
        response = self.make_request('POST', 'contact', contact_data)
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'message' in data
            self.log_test("Contact Form Submission", success, data)
            return success
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Contact Form Submission", False, error=error_msg)
            return False

    def test_pincode_checker(self):
        """Test pincode checker"""
        pincode_data = {"pincode": "560001"}
        response = self.make_request('POST', 'check-pincode', pincode_data)
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'serviceable' in data and 'delivery_days' in data
            self.log_test("Pincode Checker", success, data)
            return success
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Pincode Checker", False, error=error_msg)
            return False

    def test_bundle_calculator(self):
        """Test bundle calculator"""
        bundle_data = ["groundnut-oil", "coconut-oil", "sunflower-oil"]
        response = self.make_request('POST', 'bundle/calculate', bundle_data)
        
        if response and response.status_code == 200:
            data = response.json()
            success = 'items' in data and 'total' in data and 'discount' in data
            self.log_test("Bundle Calculator", success, data)
            return success
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Bundle Calculator", False, error=error_msg)
            return False

    def test_orders_api(self):
        """Test orders endpoints (requires authentication and cart items)"""
        # First ensure we have items in cart
        add_item_data = {
            "product_id": "groundnut-oil",
            "quantity": 2,
            "size": "500ml",
            "is_subscription": False
        }
        self.make_request('POST', 'cart/add', add_item_data)
        
        # Test get orders
        response = self.make_request('GET', 'orders')
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Get Orders", success, f"Found {len(data)} orders")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get Orders", False, error=error_msg)
            return False

    def test_subscriptions_api(self):
        """Test subscriptions endpoints"""
        response = self.make_request('GET', 'subscriptions')
        if response and response.status_code == 200:
            data = response.json()
            success = isinstance(data, list)
            self.log_test("Get Subscriptions", success, f"Found {len(data)} subscriptions")
            return True
        else:
            error_msg = f"Status: {response.status_code if response else 'No response'}"
            self.log_test("Get Subscriptions", False, error=error_msg)
            return False

    def run_all_tests(self):
        """Run all API tests"""
        print("🚀 Starting Krishi API Tests...")
        print(f"Testing against: {self.base_url}")
        print("=" * 50)
        
        # Basic connectivity
        if not self.test_health_check():
            print("❌ Health check failed - stopping tests")
            return False
        
        # Authentication tests
        if not self.test_admin_login():
            print("❌ Admin login failed - some tests may fail")
        
        self.test_user_registration()
        self.test_auth_me()
        
        # Core API tests
        self.test_products_api()
        self.test_collections_api()
        self.test_bestsellers_api()
        self.test_blog_api()
        
        # Authenticated endpoints
        self.test_cart_api()
        self.test_orders_api()
        self.test_subscriptions_api()
        
        # Utility endpoints
        self.test_contact_api()
        self.test_pincode_checker()
        self.test_bundle_calculator()
        
        # Print summary
        print("=" * 50)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.failed_tests:
            print("\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"  - {test['test']}: {test['error']}")
        
        success_rate = (self.tests_passed / self.tests_run) * 100 if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        return success_rate >= 80

def main():
    tester = KrishiAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())