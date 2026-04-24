from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, Query
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import os
import logging
import bcrypt
import jwt
import certifi
import base64
import mimetypes
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
from contextlib import asynccontextmanager

# MongoDB connection — lazy singleton safe for serverless/Vercel
_mongo_client: AsyncIOMotorClient = None
_mongo_db = None

def _get_client():
    global _mongo_client, _mongo_db
    if _mongo_client is None:
        _mongo_client = AsyncIOMotorClient(
            os.environ['MONGO_URL'],
            serverSelectionTimeoutMS=10000,
            connectTimeoutMS=10000,
            socketTimeoutMS=10000,
            tlsCAFile=certifi.where(),
        )
        _mongo_db = _mongo_client[os.environ['DB_NAME']]
    return _mongo_client, _mongo_db

# Aliases used throughout the codebase
client, db = _get_client()

# JWT Configuration
JWT_SECRET = os.environ.get("JWT_SECRET")
if not JWT_SECRET:
    raise RuntimeError("JWT_SECRET environment variable is required")
JWT_ALGORITHM = "HS256"

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Password hashing
def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed.decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))

# JWT Functions
def create_access_token(user_id: str, email: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(minutes=60),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "type": "refresh"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        user["_id"] = str(user["_id"])
        user.pop("password_hash", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def get_optional_user(request: Request) -> Optional[dict]:
    try:
        return await get_current_user(request)
    except HTTPException:
        return None

# Pydantic Models
class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str] = None
    role: str = "user"

class ProductCreate(BaseModel):
    name: str
    slug: str
    description: str
    price: float
    compare_price: Optional[float] = None
    collection: str
    images: List[str] = []
    sizes: List[Dict[str, Any]] = []
    stock: int = 50
    benefits: List[str] = []
    uses: List[str] = []
    nutritional_facts: Optional[str] = None
    storage: Optional[str] = None
    tags: List[str] = []

class CartItem(BaseModel):
    product_id: str
    quantity: int = 1
    size: Optional[str] = None
    is_subscription: bool = False
    frequency: Optional[str] = None

class CartUpdate(BaseModel):
    items: List[CartItem]

class OrderCreate(BaseModel):
    items: List[CartItem]
    shipping_address: Dict[str, str]
    payment_method: str = "COD"
    is_subscription: bool = False
    subscription_frequency: Optional[str] = None

class SubscriptionUpdate(BaseModel):
    action: str  # pause, resume, skip, cancel
    next_delivery_date: Optional[str] = None

class ContactForm(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None
    message: str

class PincodeCheck(BaseModel):
    pincode: str

class BlogPost(BaseModel):
    title: str
    slug: str
    content: str
    excerpt: str
    category: str
    image: str = ""
    author: str = "Krishi Team"
    status: str = "published"  # draft | published
    # SEO
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    focus_keyword: Optional[str] = None
    canonical_url: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    # AEO
    faqs: List[Dict[str, str]] = []
    # GEO
    geo_summary: Optional[str] = None
    entities: List[str] = []
    schema_type: str = "BlogPosting"
    tags: List[str] = []

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    excerpt: Optional[str] = None
    category: Optional[str] = None
    image: Optional[str] = None
    author: Optional[str] = None
    status: Optional[str] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    focus_keyword: Optional[str] = None
    canonical_url: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None
    faqs: Optional[List[Dict[str, str]]] = None
    geo_summary: Optional[str] = None
    entities: Optional[List[str]] = None
    schema_type: Optional[str] = None
    tags: Optional[List[str]] = None

class CMSPageUpsert(BaseModel):
    name: str
    route: str
    status: str = "draft"  # draft | published
    content_html: str = ""
    sections: Dict[str, Any] = {}
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None

class CMSPageUpdate(BaseModel):
    name: Optional[str] = None
    route: Optional[str] = None
    status: Optional[str] = None
    content_html: Optional[str] = None
    sections: Optional[Dict[str, Any]] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    og_title: Optional[str] = None
    og_description: Optional[str] = None
    og_image: Optional[str] = None

# ─────────────────────────────────────────────
# Products Data — All 39 SKUs with full details
# ─────────────────────────────────────────────
PRODUCTS_SEED = [
    # ── Cold Pressed Oils ──────────────────────────────────────────────────
    {
        "name": "Groundnut Oil",
        "slug": "groundnut-oil",
        "sort_order": 1,
        "collection": "cold-pressed-oils",
        "price": 350,
        "compare_price": 450,
        "stock": 45,
        "description": "Cold-pressed groundnut oil extracted from premium quality peanuts without heat or chemicals, retaining its natural aroma, flavor, and nutrients. It is a traditional cooking oil widely used in South Indian cuisine.",
        "benefits": [
            "Rich in monounsaturated and polyunsaturated fats that support heart health",
            "Contains Vitamin E, a powerful antioxidant that protects cells from oxidative damage",
            "Boosts immunity and helps reduce inflammation in the body",
            "Has a high smoke point (~232\u00b0C), making it suitable for deep frying without breaking down"
        ],
        "uses": [
            "Ideal for deep frying, saut\u00e9ing, and stir-frying Indian dishes",
            "Used as a base oil in traditional pickles and chutneys",
            "Applied externally for hair and skin nourishment",
            "Used in traditional oil pulling for oral health"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 17g, MUFA 46g, PUFA 32g), Vitamin E 15.69mg, Zero carbs/protein",
        "storage": "Store in a cool, dark place away from direct sunlight. Keep tightly sealed. Best used within 6 months of opening.",
        "images": ["/images/products/lifestyle-02.png", "/images/products/lifestyle-03.png", "/images/products/lifestyle-04.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Coconut Oil",
        "slug": "coconut-oil",
        "sort_order": 2,
        "collection": "cold-pressed-oils",
        "price": 320,
        "compare_price": 400,
        "stock": 50,
        "description": "Cold-pressed coconut oil made from fresh coconut kernels, preserving its natural fragrance and beneficial medium-chain fatty acids. It is a versatile oil used in cooking, beauty, and wellness.",
        "benefits": [
            "Rich in lauric acid which has strong antimicrobial and antifungal properties",
            "Supports thyroid function and boosts metabolism due to medium-chain triglycerides (MCTs)",
            "Promotes brain health and may support cognitive function via ketone production",
            "Deeply moisturizes skin and strengthens hair when applied topically"
        ],
        "uses": [
            "Used for cooking South Indian dishes, tempering, and making coconut-based curries",
            "Applied as a natural hair conditioner and scalp treatment",
            "Used as a skin moisturizer, makeup remover, and lip balm",
            "Used in oil pulling to promote dental hygiene and fresher breath"
        ],
        "nutritional_facts": "Per 100ml: Calories 892 kcal, Total Fat 99.1g (Saturated 82.5g, MUFA 6.3g, PUFA 1.7g), Lauric Acid 44g, No significant carbs or protein",
        "storage": "Store at room temperature below 25\u00b0C. Solidifies in cool weather \u2014 this is normal. Keep sealed away from moisture and sunlight.",
        "images": ["/images/products/coconut-oil-1.png", "/images/products/coconut-oil-2.png", "/images/products/coconut-oil-3.png", "/images/products/coconut-oil-4.png", "/images/products/coconut-oil-5.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Sunflower Oil",
        "slug": "sunflower-oil",
        "sort_order": 3,
        "collection": "cold-pressed-oils",
        "price": 280,
        "compare_price": 350,
        "stock": 40,
        "description": "Cold-pressed sunflower oil extracted from high-oleic sunflower seeds without chemicals or heat treatment. It is light in flavor and color, making it suitable for a wide range of cooking applications.",
        "benefits": [
            "High in Vitamin E and linoleic acid, supporting skin health and reducing inflammation",
            "Low in saturated fats, making it a heart-friendly cooking oil",
            "Helps reduce LDL cholesterol when used as part of a balanced diet",
            "Contains phytosterols that may block cholesterol absorption in the gut"
        ],
        "uses": [
            "Suitable for baking, roasting, and light frying due to its mild flavor",
            "Used as salad dressings and in mayonnaise preparation",
            "Applied on skin as a lightweight moisturizer",
            "Used in baby care products due to its gentle, non-irritating nature"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 10g, MUFA 20g, PUFA 66g), Vitamin E 41.1mg, Zero protein/carbs",
        "storage": "Store in a cool, dark place away from heat and sunlight. Refrigerate after opening for extended shelf life. Use within 4-6 months.",
        "images": ["/images/products/lifestyle-05.png", "/images/products/lifestyle-06.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Deepam Oil",
        "slug": "deepam-oil",
        "sort_order": 12,
        "collection": "cold-pressed-oils",
        "price": 220,
        "compare_price": 280,
        "stock": 50,
        "description": "Deepam oil (lamp oil) is a traditional sesame-based oil used for lighting lamps in Hindu rituals and worship. It burns cleanly and is considered sacred in Vedic traditions.",
        "benefits": [
            "Burns with a clean, steady flame making it ideal for ritual lamps and diyas",
            "Has spiritual significance in Hindu traditions, believed to ward off negative energy",
            "Produces minimal smoke and soot compared to commercial lamp oils",
            "Natural and chemical-free, safe for indoor worship and daily lamp lighting"
        ],
        "uses": [
            "Used for lighting oil lamps (diyas) during daily puja and festivals",
            "Used in temple rituals and religious ceremonies",
            "Applied in traditional Deepam (five-lamp worship) rituals",
            "Can be used for aromatherapy lamps due to its natural composition"
        ],
        "nutritional_facts": "Not applicable (not intended for consumption). Composition: Sesame oil base with natural wick-compatible viscosity.",
        "storage": "Store in a cool, dry place away from open flames. Keep tightly sealed. Avoid exposure to direct sunlight.",
        "images": ["/images/products/deepam-oil-1.png", "/images/products/deepam-oil-2.png", "/images/products/deepam-oil-3.png", "/images/products/deepam-oil-4.png", "/images/products/deepam-oil-5.png", "/images/products/deepam-oil-6.png"],
        "tags": []
    },
    {
        "name": "Castor Oil",
        "slug": "castor-oil",
        "sort_order": 7,
        "collection": "cold-pressed-oils",
        "price": 250,
        "compare_price": 320,
        "stock": 40,
        "description": "Cold-pressed castor oil derived from Ricinus communis seeds, rich in ricinoleic acid. This thick, pale-yellow oil has been used for centuries in Ayurvedic medicine, skincare, and haircare.",
        "benefits": [
            "Ricinoleic acid provides powerful anti-inflammatory and pain-relieving properties",
            "Stimulates hair growth, reduces scalp dryness, and controls dandruff",
            "Acts as a natural laxative by promoting bowel movement when taken internally (under guidance)",
            "Deeply moisturizes skin, helps fade scars, and fights acne-causing bacteria"
        ],
        "uses": [
            "Applied on scalp and hair to promote thickness and reduce hair fall",
            "Used on skin as a deep moisturizer, particularly for dry patches and cracked heels",
            "Used medicinally under medical supervision as a natural laxative",
            "Applied on eyebrows and eyelashes to promote growth and thickness"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 2g, MUFA 4g, PUFA 5g, Ricinoleic Acid ~87g). Not for general internal consumption.",
        "storage": "Store in a cool, dark place in an airtight container. Refrigerate to extend shelf life. Use within 1 year of opening.",
        "images": ["/images/products/castor-oil-1.png", "/images/products/castor-oil-2.png", "/images/products/castor-oil-3.png", "/images/products/castor-oil-4.png"],
        "tags": []
    },
    {
        "name": "Gingelly Oil (Sesame Oil)",
        "slug": "gingelly-oil",
        "sort_order": 4,
        "collection": "cold-pressed-oils",
        "price": 380,
        "compare_price": 480,
        "stock": 35,
        "description": "Cold-pressed gingelly oil (sesame oil) made from unroasted sesame seeds, offering a mild nutty flavor. It is a staple oil in South Indian cooking and traditional medicine, valued for its rich lignans and antioxidants.",
        "benefits": [
            "Contains sesamin and sesamolin \u2014 powerful lignans with antioxidant and anti-aging properties",
            "Regular consumption helps lower blood pressure and supports cardiovascular health",
            "Natural antibacterial and anti-inflammatory properties make it ideal for oil pulling",
            "Rich in zinc and Vitamin E, promoting bone health and skin radiance"
        ],
        "uses": [
            "Used in traditional South Indian cooking \u2014 rice, curries, kozhukattai, and sweets",
            "Used for oil pulling to improve oral health and reduce bacteria",
            "Applied for traditional Ayurvedic massage (Abhyanga) to nourish joints and skin",
            "Used in marinades and salad dressings for a subtle nutty flavor"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 14g, MUFA 40g, PUFA 42g), Vitamin E 1.4mg, Sesamin 0.5g, Calcium 9.5mg",
        "storage": "Store in a cool, dark place away from direct sunlight. Keep tightly capped. Best used within 6 months after opening.",
        "images": ["/images/products/sesame-oil-1.png", "/images/products/sesame-oil-2.png", "/images/products/sesame-oil-3.png", "/images/products/sesame-oil-4.png", "/images/products/sesame-oil-5.png", "/images/products/sesame-oil-6.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Safflower Oil",
        "slug": "safflower-oil",
        "sort_order": 5,
        "collection": "cold-pressed-oils",
        "price": 340,
        "compare_price": 420,
        "stock": 28,
        "description": "Cold-pressed safflower oil extracted from safflower seeds, one of the richest plant sources of linoleic acid (omega-6). It is light in texture with a neutral flavor, suitable for high-heat cooking and skincare.",
        "benefits": [
            "High in linoleic acid (omega-6), which supports skin barrier health and reduces inflammation",
            "Helps manage blood sugar levels by improving insulin sensitivity",
            "May help lower LDL cholesterol and triglycerides when used in place of saturated fats",
            "Lightweight texture makes it highly effective as a non-comedogenic skin moisturizer"
        ],
        "uses": [
            "Used for high-heat cooking such as stir-frying and deep frying",
            "Applied as a carrier oil in aromatherapy and skincare formulations",
            "Used in salad dressings for a light, neutral flavor",
            "Applied on skin for moisturization, especially for oily and acne-prone skin"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 6g, MUFA 14g, PUFA 75g), Vitamin E 34.1mg, No carbs/protein",
        "storage": "Store in a cool, dry place away from sunlight. Refrigerate after opening. Use within 4-6 months for optimal freshness.",
        "images": ["https://images.unsplash.com/photo-1601004890684-d8cbf643f5f2?w=1200"],
        "tags": []
    },
    {
        "name": "Neem Oil",
        "slug": "neem-oil",
        "sort_order": 13,
        "collection": "cold-pressed-oils",
        "price": 280,
        "compare_price": 350,
        "stock": 35,
        "description": "Cold-pressed neem oil extracted from neem seeds (Azadirachta indica). It has a characteristic pungent smell and is one of the most powerful natural pesticides and medicinal oils with broad-spectrum biological activity.",
        "benefits": [
            "Azadirachtin in neem oil is a powerful natural pesticide disrupting insect growth and reproduction",
            "Potent antifungal properties treat skin conditions like ringworm, eczema, and athlete's foot",
            "Natural antibacterial agent effective against acne-causing bacteria and scalp infections",
            "Traditional Ayurvedic use for oral health \u2014 reduces gum inflammation and bacterial growth"
        ],
        "uses": [
            "Diluted and used as an organic pesticide spray for garden plants and crops",
            "Applied on scalp to treat dandruff, lice, and fungal infections",
            "Mixed with coconut oil and applied on skin for acne, psoriasis, and eczema management",
            "Added to Ayurvedic herbal formulations for anti-parasitic and immune-boosting treatments"
        ],
        "nutritional_facts": "Not for internal consumption. Composition per 100ml: Fat 99g, Azadirachtin 300-2500 ppm, Nimbin, Nimbidin, Oleic acid 25%, Stearic acid 20%",
        "storage": "Store in a dark glass bottle in a cool place. Solidifies in cool temperatures \u2014 warm gently before use. Shelf life: 1-2 years.",
        "images": ["https://images.unsplash.com/photo-1615485925873-99e20bd76f16?w=1200"],
        "tags": []
    },
    {
        "name": "Hippe Oil (Mahua Oil)",
        "slug": "hippe-oil",
        "sort_order": 15,
        "collection": "cold-pressed-oils",
        "price": 390,
        "compare_price": 480,
        "stock": 18,
        "description": "Hippe oil, also known as Mahua oil or Illipe butter, is cold-pressed from the seeds of the Madhuca longifolia tree. It is traditionally used by tribal communities in India for cooking, skincare, and as a lamp oil.",
        "benefits": [
            "Rich in stearic and oleic acid, deeply nourishing and softening for dry and damaged skin",
            "Natural emollient properties make it effective for treating dry scalp and frizzy hair",
            "High smoke point makes it suitable for cooking in traditional tribal communities",
            "Used in Ayurveda for joint pain massage due to its warming and anti-inflammatory properties"
        ],
        "uses": [
            "Applied as a body butter and skin moisturizer, particularly for very dry or cracked skin",
            "Used as a hair conditioning oil for deep conditioning and frizz control",
            "Used in tribal communities for cooking and as fuel for traditional lamps",
            "Incorporated into natural soap, lotion, and lip balm formulations"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 48g, MUFA 41g, PUFA 10g), Rich in stearic acid 24%, oleic acid 41%",
        "storage": "Store in a cool, dark place. May solidify below 20\u00b0C \u2014 this is normal. Keep sealed to prevent rancidity. Shelf life: 12-18 months.",
        "images": ["/images/products/lifestyle-07.png", "/images/products/lifestyle-09.png"],
        "tags": []
    },
    {
        "name": "Almond Oil",
        "slug": "almond-oil",
        "sort_order": 9,
        "collection": "cold-pressed-oils",
        "price": 650,
        "compare_price": 800,
        "stock": 15,
        "description": "Cold-pressed almond oil extracted from premium sweet almonds (Prunus dulcis), retaining its natural Vitamin E, fatty acids, and mild nutty scent. It is widely used in Ayurvedic medicine, skincare, and hair care.",
        "benefits": [
            "Extremely high in Vitamin E \u2014 one of the best plant sources, protecting skin from UV damage and aging",
            "Easily absorbed by skin and hair, providing deep moisturization without clogging pores",
            "Rich in monounsaturated fats that nourish the scalp and promote lustrous, strong hair",
            "Anti-inflammatory and emollient properties soothe skin conditions like eczema and psoriasis"
        ],
        "uses": [
            "Applied as a daily face and body oil for natural moisturization and anti-aging",
            "Used as a hair oil or hot oil treatment for scalp nourishment and shine",
            "Used as a baby massage oil \u2014 gentle enough for newborn skin",
            "Used as a carrier oil in essential oil blends and aromatherapy preparations"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 8g, MUFA 70g, PUFA 17g), Vitamin E 39.2mg, Phytosterols 230mg",
        "storage": "Store in a cool, dark place away from direct sunlight. Refrigerate after opening. Use within 6-12 months to prevent rancidity.",
        "images": ["/images/products/almond-oil-1.png", "/images/products/almond-oil-3.png", "/images/products/almond-oil-4.png", "/images/products/almond-oil-5.png"],
        "tags": []
    },
    {
        "name": "Virgin Coconut Oil",
        "slug": "virgin-coconut-oil",
        "sort_order": 10,
        "collection": "cold-pressed-oils",
        "price": 480,
        "compare_price": 600,
        "stock": 30,
        "description": "Virgin coconut oil (VCO) is extracted from fresh coconut milk without any heat or chemical refining using the wet process or cold press method. It retains the highest amount of lauric acid, antioxidants, and coconut aroma.",
        "benefits": [
            "Highest lauric acid concentration (~50%) with exceptional antimicrobial and antiviral properties",
            "Rich in antioxidants including tocopherols and polyphenols that are absent in refined coconut oil",
            "MCTs (medium-chain triglycerides) boost metabolism and provide quick, clean energy to the brain",
            "Excellent for skin and hair with natural moisturizing properties and UV protection factor"
        ],
        "uses": [
            "Consumed raw \u2014 added to smoothies, coffee, or taken directly for health benefits",
            "Used in cooking at low to medium heat to preserve its delicate antioxidants",
            "Applied directly on skin and hair as a premium natural moisturizer",
            "Used in oil pulling for enhanced oral health and whiter teeth"
        ],
        "nutritional_facts": "Per 100ml: Calories 892 kcal, Total Fat 99.1g (Saturated 86g, Lauric Acid 48g, MUFA 6g, PUFA 2g), Vitamin E 0.2mg, Polyphenols present",
        "storage": "Store at room temperature (below 25\u00b0C). Solidifies below 24\u00b0C \u2014 this is normal. Keep in a sealed glass jar away from sunlight. Shelf life: 2 years.",
        "images": ["/images/products/virgin-coconut-oil-1.png", "/images/products/virgin-coconut-oil-3.png", "/images/products/virgin-coconut-oil-4.png", "/images/products/virgin-coconut-oil-5.png"],
        "tags": []
    },
    {
        "name": "Mustard Oil",
        "slug": "mustard-oil",
        "sort_order": 6,
        "collection": "cold-pressed-oils",
        "price": 260,
        "compare_price": 320,
        "stock": 48,
        "description": "Cold-pressed mustard oil extracted from black or yellow mustard seeds. A pungent, golden-colored oil widely used across North India, Bengal, and Pakistan for cooking, pickling, and traditional medicine.",
        "benefits": [
            "Rich in allyl isothiocyanate which gives it natural antimicrobial, antibacterial, and antifungal properties",
            "Contains omega-3 alpha-linolenic acid in a favorable omega-6:omega-3 ratio supporting heart health",
            "Natural warming agent \u2014 Ayurvedic massage with mustard oil improves blood circulation and relieves joint pain",
            "Stimulates digestive juices and appetite, helping treat indigestion, bloating, and constipation"
        ],
        "uses": [
            "Used as the primary cooking oil in Bengali, Odia, and North Indian cuisines for curries and fish",
            "Used for making traditional Indian pickles (achaar) as its pungency preserves food naturally",
            "Applied as a winter body massage oil to improve circulation and warmth",
            "Applied on scalp and hair for nourishment, reducing dandruff and promoting hair growth"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 11.6g, MUFA 59.2g, PUFA 21.2g, Omega-3 5.9g), Erucic Acid 42g, Vitamin E 5.4mg",
        "storage": "Store in a glass bottle at room temperature away from direct light. Best used within 6 months of opening. Keep sealed tightly.",
        "images": ["https://images.unsplash.com/photo-1621947081720-86970823b77a?w=1200"],
        "tags": ["bestseller"]
    },
    {
        "name": "Flaxseed Oil",
        "slug": "flaxseed-oil",
        "sort_order": 11,
        "collection": "cold-pressed-oils",
        "price": 450,
        "compare_price": 550,
        "stock": 25,
        "description": "Cold-pressed flaxseed (linseed) oil from organically grown flax seeds. It is the richest plant-based source of omega-3 alpha-linolenic acid (ALA), making it highly valued for heart, brain, and hormonal health.",
        "benefits": [
            "Richest plant source of ALA omega-3 fatty acids \u2014 supports heart health and reduces inflammation",
            "Contains lignans \u2014 antioxidant phytoestrogens that support hormonal balance and may reduce cancer risk",
            "Natural laxative effect when consumed regularly helps relieve constipation and improve gut health",
            "Reduces LDL cholesterol, blood pressure, and arterial stiffness when included in daily diet"
        ],
        "uses": [
            "Added to smoothies, salads, and dips raw \u2014 NOT suitable for cooking (heat destroys omega-3s)",
            "Drizzled over cooked food just before serving to add nutritional value without heat damage",
            "Used topically on skin to reduce inflammation and dryness in eczema and psoriasis",
            "Mixed into yogurt, oatmeal, or protein shakes for daily omega-3 supplementation"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 9g, MUFA 18g, PUFA 68g, ALA Omega-3 53g), Vitamin E 0.5mg, Lignans 0.3g",
        "storage": "MUST be refrigerated at all times. Highly prone to rancidity due to high PUFA content. Keep in a dark glass bottle. Use within 3 months of opening.",
        "images": ["/images/products/flaxseed-oil-1.png", "/images/products/flaxseed-oil-3.png", "/images/products/flaxseed-oil-4.png", "/images/products/flaxseed-oil-5.png"],
        "tags": []
    },
    {
        "name": "Niger Seed Oil",
        "slug": "niger-seed-oil",
        "sort_order": 8,
        "collection": "cold-pressed-oils",
        "price": 420,
        "compare_price": 520,
        "stock": 20,
        "description": "Cold-pressed niger seed oil (Guizotia abyssinica) from black niger (ramtil) seeds. Widely used in Maharashtra and South India, this oil has a distinctive nutty flavor and is particularly rich in linoleic acid.",
        "benefits": [
            "Very high in linoleic acid (omega-6) which is essential for skin health, inflammation management, and cell function",
            "Natural antioxidants including tocopherols protect the oil and body from oxidative stress",
            "Traditionally used in Ayurveda for joint lubrication and relief from arthritis pain",
            "Good source of plant protein and healthy fats when seeds are consumed directly"
        ],
        "uses": [
            "Used as a primary cooking oil in Maharashtra, Karnataka, and parts of Andhra Pradesh",
            "Used in traditional pickles and chutneys for its unique pungent, nutty flavor",
            "Applied externally as a massage oil for joint pain and rheumatic conditions",
            "Mixed with mustard oil for hair and scalp treatments in rural Indian traditions"
        ],
        "nutritional_facts": "Per 100ml: Calories 884 kcal, Total Fat 100g (Saturated 8g, MUFA 12g, PUFA 75g, Linoleic Acid 70g), Vitamin E 5mg",
        "storage": "Store in a cool, dark place. Keep sealed away from moisture and heat. Use within 4-6 months of opening.",
        "images": ["https://images.unsplash.com/photo-1599707367072-cd6ada2bc375?w=1200"],
        "tags": []
    },

    {
        "name": "Pongomia Oil",
        "slug": "pongomia-oil",
        "sort_order": 14,
        "collection": "cold-pressed-oils",
        "price": 300,
        "compare_price": 380,
        "stock": 25,
        "description": "Cold-pressed Pongomia oil (Karanja oil) extracted from the seeds of the Pongamia pinnata tree. Used in traditional Ayurvedic medicine and as an organic pesticide, it has a distinct bitter taste and strong odor.",
        "benefits": [
            "Natural biopesticide effective against a wide range of crop pests and insects",
            "Rich in karanjin and pongamol — biologically active flavonoids with antifungal and antibacterial properties",
            "Used in Ayurveda for treating skin conditions like eczema, psoriasis, and leprosy",
            "Supports sustainable agriculture as a chemical-free crop protection agent"
        ],
        "uses": [
            "Diluted and used as a natural pesticide spray for organic farming",
            "Applied topically in Ayurvedic preparations for skin disease management",
            "Used as a lamp oil and biodiesel feedstock in rural communities",
            "Added to herbal formulations for anti-parasitic and wound-healing applications"
        ],
        "nutritional_facts": "Not for food consumption. Per 100ml: Fat 98g, Karanjin 1-2%, Oleic acid 52%, Linoleic acid 16%, Palmitic acid 11%",
        "storage": "Store in a cool, dark place in an airtight bottle. Shelf life: 12-18 months. Keep away from food products.",
        "images": ["/images/products/lifestyle-07.png"],
        "tags": []
    },

    # ── Ghee & Honey ───────────────────────────────────────────────────────
    {
        "name": "Desi Cow Ghee",
        "slug": "desi-ghee",
        "sort_order": 16,
        "collection": "ghee-honey",
        "price": 550,
        "compare_price": 650,
        "stock": 30,
        "description": "Traditional cow ghee made by slowly simmering butter to remove water and milk solids. It has a rich golden color, nutty aroma, and is a cornerstone of Ayurvedic cooking and healing practices.",
        "benefits": [
            "Contains butyric acid which nourishes the intestinal lining and supports gut health",
            "Rich in fat-soluble vitamins A, D, E, and K essential for immunity and bone health",
            "Dairy-free (casein and lactose removed), making it tolerable for most lactose-intolerant individuals",
            "High smoke point (~250\u00b0C) makes it one of the safest fats for high-heat cooking"
        ],
        "uses": [
            "Used in traditional Indian cooking \u2014 tadka, rotis, khichdi, rice, and sweets",
            "Used in Ayurvedic therapies such as Nasya (nasal drops) and Netra Tarpana (eye care)",
            "Applied on skin and lips as a natural moisturizer",
            "Used in religious rituals, havan (fire ceremonies), and lamp lighting"
        ],
        "nutritional_facts": "Per 100g: Calories 900 kcal, Total Fat 99.8g (Saturated 61.9g, MUFA 25.4g, PUFA 3.7g), Vitamin A 3069 IU, Vitamin E 2.8mg, Cholesterol 256mg",
        "storage": "Store in an airtight glass jar at room temperature away from moisture. Does not need refrigeration. Stays fresh for 6-12 months.",
        "images": ["/images/products/lifestyle-fsr.jpg", "/images/products/lifestyle-img1.jpg"],
        "tags": ["bestseller"]
    },
    {
        "name": "A2 Cow Ghee",
        "slug": "a2-ghee",
        "sort_order": 17,
        "collection": "ghee-honey",
        "price": 750,
        "compare_price": 900,
        "stock": 20,
        "description": "A2 ghee is made from the milk of indigenous Desi cows (Gir, Sahiwal) that produce only A2 beta-casein protein. It is prepared using the traditional bilona (churning) method, retaining superior nutritional and medicinal properties.",
        "benefits": [
            "Contains A2 beta-casein protein \u2014 easier to digest and less likely to cause dairy discomfort",
            "Rich in omega-3 fatty acids, CLA, and antioxidants that support heart and brain health",
            "Probiotic precursor \u2014 supports gut microbiome health and improves nutrient absorption",
            "Prepared via bilona method retaining maximum vitamins, including K2 for bone health"
        ],
        "uses": [
            "Used in cooking dals, rotis, rice, and sweets for superior flavor and nutrition",
            "Consumed daily (1 tsp) as an Ayurvedic tonic for digestion and immunity",
            "Applied on newborns' skin and given to elders for joint lubrication",
            "Used in panchakarma therapies and traditional Ayurvedic treatments"
        ],
        "nutritional_facts": "Per 100g: Calories 897 kcal, Total Fat 99.5g (Saturated 58g, MUFA 27g, PUFA 4g), CLA 0.9g, Omega-3 0.4g, Vitamins A, D, E, K2",
        "storage": "Store in a clean glass jar at room temperature away from sunlight and moisture. No refrigeration needed. Use within 6-12 months.",
        "images": ["/images/products/lifestyle-img2.jpg", "/images/products/lifestyle-img3.jpg"],
        "tags": []
    },
    {
        "name": "Mountain Honey",
        "slug": "mountain-honey",
        "sort_order": 19,
        "collection": "ghee-honey",
        "price": 420,
        "compare_price": 520,
        "stock": 25,
        "description": "Raw, unprocessed mountain honey sourced from wild honeybee colonies in forested hillside regions. It is naturally rich in enzymes, antioxidants, and antimicrobial compounds without any additives or heating.",
        "benefits": [
            "Contains hydrogen peroxide and methylglyoxal providing natural antimicrobial properties",
            "Rich in antioxidants including flavonoids and phenolic acids that protect against oxidative stress",
            "Soothes sore throats, suppresses coughs, and supports respiratory health naturally",
            "Provides sustained energy and supports gut health as a natural prebiotic"
        ],
        "uses": [
            "Consumed directly (1-2 tsp daily) as a natural immunity booster",
            "Used as a natural sweetener in herbal teas, lemon water, and health drinks",
            "Applied topically on wounds, burns, and skin for its natural healing properties",
            "Used in face masks and hair packs for moisturization and anti-bacterial benefits"
        ],
        "nutritional_facts": "Per 100g: Calories 304 kcal, Carbohydrates 82.4g (Fructose 38g, Glucose 31g), Protein 0.3g, Water 17g, Antioxidants, Trace enzymes",
        "storage": "Store in a glass jar at room temperature. Never refrigerate as it causes crystallization. Keep away from moisture. Shelf life: 2+ years.",
        "images": ["/images/products/lifestyle-img4.jpg", "/images/products/lifestyle-img5.jpg"],
        "tags": ["bestseller"]
    },

    {
        "name": "Wildforest Honey",
        "slug": "wildforest-honey",
        "sort_order": 18,
        "collection": "ghee-honey",
        "price": 480,
        "compare_price": 580,
        "stock": 20,
        "description": "Raw wildforest honey collected by tribal communities from wild beehives in deep forest regions of India. Unheated and unprocessed, it contains a rich diversity of pollens, enzymes, and antimicrobial compounds from hundreds of wildflower species.",
        "benefits": [
            "Contains diverse pollen from hundreds of wildflower species — exceptional antioxidant diversity",
            "Rich in natural enzymes including diastase, invertase, and glucose oxidase",
            "Stronger antimicrobial properties than monofloral honeys due to complex biochemical composition",
            "Traditionally used by tribal healers for wound healing, digestion, and respiratory relief"
        ],
        "uses": [
            "Consumed directly (1 tsp daily) as a broad-spectrum natural immunity booster",
            "Applied on wounds, insect bites, and minor burns for natural healing",
            "Used in herbal teas and warm water as a soothing natural sweetener",
            "Used in traditional forest medicine formulations for respiratory and digestive health"
        ],
        "nutritional_facts": "Per 100g: Calories 300 kcal, Carbohydrates 80g (Fructose 40g, Glucose 35g), Protein 0.5g, Water 17g, Diverse pollen and enzyme content",
        "storage": "Store in a glass jar at room temperature away from moisture. Do not refrigerate. Natural crystallization may occur — gently warm to re-liquefy. Shelf life: 2+ years.",
        "images": ["https://images.unsplash.com/photo-1587049016823-ae4f90d0a9d2?w=1200"],
        "tags": ["bestseller"]
    },
    {
        "name": "Moringa Honey",
        "slug": "moringa-honey",
        "sort_order": 20,
        "collection": "ghee-honey",
        "price": 380,
        "compare_price": 460,
        "stock": 25,
        "description": "Moringa honey is raw honey collected from beehives placed near moringa (drumstick) tree plantations. The bees feed on moringa flowers, imparting a unique floral note and the beneficial phytochemicals of moringa to the honey.",
        "benefits": [
            "Combines the nutritional benefits of honey and moringa — rich in antioxidants and anti-inflammatory compounds",
            "Moringa phytochemicals in the honey support blood sugar regulation and metabolic health",
            "Natural antibacterial and antifungal properties from both honey and moringa compounds",
            "Supports liver health, reduces inflammation, and boosts overall immunity"
        ],
        "uses": [
            "Consumed daily (1-2 tsp) as a wellness tonic for immunity and energy",
            "Added to warm water or herbal tea as a natural sweetener with added health benefits",
            "Applied topically on skin for nourishment and anti-inflammatory relief",
            "Used in Ayurvedic and natural health formulations for detoxification"
        ],
        "nutritional_facts": "Per 100g: Calories 295 kcal, Carbohydrates 78g, Natural sugars 75g, Moringa phytochemicals present, Antioxidants, Trace enzymes",
        "storage": "Store in a glass jar at room temperature. Keep away from moisture and sunlight. Do not refrigerate. Shelf life: 2+ years.",
        "images": ["/images/products/lifestyle-img1.jpg"],
        "tags": []
    },

    # ── Traditional Rices ──────────────────────────────────────────────────
    {
        "name": "Bamboo Rice",
        "slug": "bamboo-rice",
        "sort_order": 34,
        "collection": "traditional-rices",
        "price": 380,
        "compare_price": 480,
        "stock": 15,
        "description": "Bamboo rice is the seed harvested from dying bamboo plants \u2014 a rare, once-in-decades occurrence. It is similar in appearance to short-grain white rice and is traditionally consumed by indigenous tribal communities for its healing properties.",
        "benefits": [
            "Rich in protein compared to regular rice, providing essential amino acids for muscle repair",
            "Contains unique phytochemicals found only in bamboo that have anti-inflammatory effects",
            "Believed in tribal medicine to improve joint health and reduce arthritis symptoms",
            "Low fat and moderate glycemic index make it a nutritious rice alternative"
        ],
        "uses": [
            "Cooked and eaten like regular rice \u2014 used in khichdi, pulao, and simple rice meals",
            "Ground into flour for making traditional tribal flatbreads and porridges",
            "Used medicinally in traditional tribal communities for joint pain and fertility support",
            "Consumed as a unique novelty grain by health-conscious food enthusiasts"
        ],
        "nutritional_facts": "Per 100g: Calories 360 kcal, Protein 8-12g, Fat 1g, Carbohydrates 73g, Fiber 2g, Iron 3.5mg, Calcium 70mg, Zinc 1.4mg",
        "storage": "Store in an airtight glass or steel container in a cool, dry place. Keep away from moisture and sunlight. Shelf life: 6-12 months.",
        "images": ["/images/products/sesame-seeds-1.png", "/images/products/sesame-seeds-2.png"],
        "tags": []
    },
    {
        "name": "Organic Brown Rice",
        "slug": "brown-rice",
        "sort_order": 30,
        "collection": "traditional-rices",
        "price": 150,
        "compare_price": 200,
        "stock": 50,
        "description": "Unpolished brown rice is whole grain rice with only the outer hull removed, retaining the nutritious bran and germ layers. It has a slightly nutty flavor and chewy texture, making it a popular health food worldwide.",
        "benefits": [
            "High in dietary fiber which supports digestive health, regulates bowel movements, and lowers cholesterol",
            "Low glycemic index compared to white rice \u2014 beneficial for blood sugar management in diabetics",
            "Contains antioxidants including gamma-oryzanol and vitamin E that protect heart health",
            "Rich in magnesium, phosphorus, and B vitamins essential for energy metabolism and bone health"
        ],
        "uses": [
            "Cooked as a daily rice staple replacing white rice for a nutrient-dense meal",
            "Used to prepare brown rice pulao, khichdi, and mixed vegetable rice bowls",
            "Ground into rice flour for gluten-free baking and dosa/idli preparations",
            "Boiled and served with sambar, rasam, or curries as a wholesome South Indian meal"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 370 kcal, Protein 7.9g, Fat 2.9g, Carbohydrates 77g, Fiber 3.5g, Iron 1.8mg, Magnesium 143mg, Phosphorus 264mg",
        "storage": "Store in an airtight container in a cool, dry place. Refrigerate in humid climates to prevent rancidity of bran. Best used within 6 months.",
        "images": ["/images/products/sesame-seeds-3.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Organic Red Rice",
        "slug": "red-rice",
        "sort_order": 28,
        "collection": "traditional-rices",
        "price": 180,
        "compare_price": 240,
        "stock": 45,
        "description": "Red rice is an unpolished traditional rice variety with a striking red bran layer rich in anthocyanins. Cultivated in parts of Karnataka, Kerala, and Assam, it is known for its nutty flavor and superior nutritional profile.",
        "benefits": [
            "Rich in anthocyanins \u2014 powerful antioxidants that protect against cancer, heart disease, and inflammation",
            "High fiber content in the bran layer aids digestion and promotes feeling of fullness",
            "Low glycemic index regulates blood sugar, making it a better option for diabetics",
            "Contains significant iron, supporting red blood cell production and combating anemia"
        ],
        "uses": [
            "Cooked and consumed as a daily rice replacement for its superior nutritional value",
            "Used in traditional South Indian preparations like red rice kanji (porridge) and puttu",
            "Paired with coconut milk-based curries and stews in Kerala cuisine",
            "Ground into flour for red rice dosas, idappams, and gluten-free baked goods"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 362 kcal, Protein 7.5g, Fat 2.2g, Carbohydrates 75.5g, Fiber 4.5g, Iron 5.5mg, Anthocyanins 200mg, Magnesium 60mg",
        "storage": "Store in a sealed container in a cool, dry, dark place. Refrigerate in warm climates. Use within 6-12 months.",
        "images": ["/images/products/sesame-seeds-4.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Organic Black Rice",
        "slug": "black-rice",
        "sort_order": 29,
        "collection": "traditional-rices",
        "price": 280,
        "compare_price": 350,
        "stock": 30,
        "description": "Black rice (forbidden rice) is an ancient whole grain variety with a deep purple-black hue due to its very high anthocyanin content. It has a nutty, earthy flavor and chewy texture, making it one of the most antioxidant-rich grains available.",
        "benefits": [
            "Contains the highest anthocyanin content of any rice variety \u2014 outperforming blueberries in antioxidant activity",
            "Rich in vitamin E, iron, and fiber, supporting immunity, blood health, and digestion",
            "Anti-inflammatory compounds reduce risk of chronic diseases including cancer and heart disease",
            "Whole grain with bran intact provides sustained energy and better blood sugar control"
        ],
        "uses": [
            "Cooked as a standalone rice dish \u2014 the deep purple color adds visual appeal to meals",
            "Used in black rice kheer (payasam) and traditional Southeast Asian desserts",
            "Mixed with other grains and legumes in grain bowls and health salads",
            "Ground into flour for specialty breads, pancakes, and gluten-free baked goods"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 337 kcal, Protein 8.9g, Fat 3.3g, Carbohydrates 72.9g, Fiber 4.9g, Iron 3.5mg, Anthocyanins 500mg+, Vitamin E 1.8mg",
        "storage": "Store in an airtight container in a cool, dark, dry place. Refrigerate to preserve anthocyanin pigments. Use within 12 months.",
        "images": ["/images/products/sesame-seeds-6.png"],
        "tags": []
    },
    {
        "name": "Jeera Samba Rice",
        "slug": "jeera-samba-rice",
        "sort_order": 35,
        "collection": "traditional-rices",
        "price": 160,
        "compare_price": 220,
        "stock": 40,
        "description": "Jeera Samba is an aromatic traditional short-grain rice variety from South India with a distinctive cumin-like fragrance. It cooks to a soft, fluffy texture and is prized for its superior taste and moderate nutritional profile.",
        "benefits": [
            "The natural jeera-like aroma aids digestion and stimulates appetite when consumed",
            "Moderate glycemic index compared to polished white rice, better for blood sugar management",
            "Contains naturally occurring aromatic compounds that soothe the digestive tract",
            "Soft texture and easy digestibility make it suitable for all ages, including the elderly and children"
        ],
        "uses": [
            "Cooked as a fragrant everyday rice \u2014 pairs beautifully with sambar, rasam, and gravies",
            "Used to make biryani and pulao where its natural aroma enhances the dish",
            "Prepared as kanji (rice porridge) for sick individuals or new mothers during recovery",
            "Used in festive cooking for its premium flavor and fluffy texture"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 355 kcal, Protein 6.8g, Fat 0.9g, Carbohydrates 78g, Fiber 0.6g, Iron 0.4mg, Calcium 10mg, Potassium 76mg",
        "storage": "Store in an airtight container in a cool, dry place. Protect from moisture and insects. Shelf life: 12 months.",
        "images": ["https://images.unsplash.com/photo-1586201375761-83865001e31c?w=1200"],
        "tags": ["bestseller"]
    },

    {
        "name": "Rajmudi Rice (Unpolished)",
        "slug": "rajmudi-rice",
        "sort_order": 31,
        "collection": "traditional-rices",
        "price": 200,
        "compare_price": 260,
        "stock": 35,
        "description": "Rajmudi is a traditional unpolished rice variety from Karnataka, historically served to royalty and nobility. It has a distinctive reddish-brown bran, a mildly nutty flavor, and a higher nutritional profile than polished white rice.",
        "benefits": [
            "Retains bran and germ layers providing fiber, B-vitamins, and antioxidants",
            "Lower glycemic index than polished rice — better for blood sugar management",
            "Rich in magnesium and phosphorus supporting bone health and nerve function",
            "Traditional rice with heritage value — supports local Karnataka farmers and biodiversity"
        ],
        "uses": [
            "Cooked as a premium everyday rice replacing polished white rice",
            "Served at traditional Karnataka weddings and festive occasions",
            "Used in rice-based preparations like chitranna (lemon rice) and bisi bele bath",
            "Paired with sambar, rasam, and coconut-based curries in traditional South Indian meals"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 360 kcal, Protein 7g, Fat 2g, Carbohydrates 75g, Fiber 3g, Iron 2mg, Calcium 20mg",
        "storage": "Store in an airtight container in a cool, dry place. Keep away from moisture. Shelf life: 6-12 months.",
        "images": ["/images/products/sesame-seeds-bowl.jpg"],
        "tags": []
    },
    {
        "name": "Sanmadhu Rice (Unpolished)",
        "slug": "sanmadhu-rice",
        "sort_order": 32,
        "collection": "traditional-rices",
        "price": 190,
        "compare_price": 250,
        "stock": 30,
        "description": "Sanmadhu is a rare traditional unpolished rice variety known for its naturally sweet aroma and soft texture when cooked. It is grown in limited regions of Karnataka and is prized for its unique flavor and moderate nutritional profile.",
        "benefits": [
            "Natural sweetness and aroma make it ideal for everyday cooking without additional flavoring",
            "Unpolished bran provides dietary fiber, supporting digestive health",
            "Moderate glycemic index compared to fully polished white rice",
            "Supports biodiversity conservation and traditional farming livelihoods"
        ],
        "uses": [
            "Cooked as a premium daily rice for its natural aroma and soft texture",
            "Used in rice porridge (kanji) for its naturally sweet flavor",
            "Ideal for children and elderly due to its soft, easy-to-digest texture",
            "Used in simple rice dishes paired with sambar and curd"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 355 kcal, Protein 6.5g, Fat 1.5g, Carbohydrates 77g, Fiber 2g, Iron 1.5mg",
        "storage": "Store in a sealed container in a cool, dry place. Protect from moisture and insects. Shelf life: 6-12 months.",
        "images": ["/images/products/sesame-seeds-1.png"],
        "tags": []
    },
    {
        "name": "Sona Masuri (Raw Rice)",
        "slug": "sona-masuri-rice",
        "sort_order": 33,
        "collection": "traditional-rices",
        "price": 130,
        "compare_price": 180,
        "stock": 50,
        "description": "Sona Masuri is a medium-grain, lightweight, and aromatic rice variety developed in Andhra Pradesh and Karnataka. It is one of the most popular varieties in South India for its ease of cooking and versatile use in everyday meals.",
        "benefits": [
            "Lower starch content than many rice varieties — easier to digest and lighter on the stomach",
            "Medium glycemic index making it a better option than high-GI white rice varieties",
            "Cooks evenly and absorbs flavors well — ideal for a wide range of preparations",
            "Naturally aromatic with a pleasant mild flavor suitable for all age groups"
        ],
        "uses": [
            "Cooked as the primary everyday rice in South Indian homes",
            "Used to prepare idli, dosa, and other fermented rice dishes",
            "Used in biryani, pulao, and fried rice for its ability to stay separate when cooked",
            "Prepared as plain rice paired with curries, sambhar, and pickles"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 356 kcal, Protein 6.7g, Fat 0.5g, Carbohydrates 79g, Fiber 0.4g, Iron 0.3mg, Calcium 10mg",
        "storage": "Store in an airtight container in a cool, dry, ventilated place. Protect from moisture, heat, and pests. Shelf life: 12 months.",
        "images": ["/images/products/sesame-seeds-3.png"],
        "tags": ["bestseller"]
    },

    # ── Unpolished Millets ─────────────────────────────────────────────────
    {
        "name": "Saame \u2013 Little Millet (Unpolished)",
        "slug": "saame-little-millet",
        "sort_order": 38,
        "collection": "unpolished-millets",
        "price": 120,
        "compare_price": 160,
        "stock": 50,
        "description": "Unpolished little millet (Saame/Kutki) is a highly nutritious ancient grain, one of the smallest millets, rich in fiber and minerals. It is gluten-free and suitable for people with diabetes and digestive sensitivities.",
        "benefits": [
            "Very high in dietary fiber which aids digestion, prevents constipation, and feeds gut bacteria",
            "Low glycemic index (GI) makes it ideal for managing blood sugar in diabetic individuals",
            "Good source of iron and zinc, supporting immune function and energy metabolism",
            "Gluten-free grain, ideal for those with celiac disease or gluten intolerance"
        ],
        "uses": [
            "Cooked as a rice substitute \u2014 used to make millet khichdi, pongal, and upma",
            "Ground into flour for making rotis, dosas, and traditional millet-based pancakes",
            "Soaked and fermented to make traditional South Indian kanji (millet porridge)",
            "Used in baby food preparations as a nutritious first grain for infants"
        ],
        "nutritional_facts": "Per 100g: Calories 329 kcal, Protein 7.7g, Fat 4.7g, Carbohydrates 67g, Fiber 7.6g, Iron 9.3mg, Calcium 17mg, Phosphorus 220mg",
        "storage": "Store in an airtight container in a cool, dry place. Protect from moisture and insects. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-01.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Korale \u2013 Brown Top Millet (Unpolished)",
        "slug": "korale-browntop-millet",
        "sort_order": 40,
        "collection": "unpolished-millets",
        "price": 140,
        "compare_price": 180,
        "stock": 45,
        "description": "Unpolished brown top millet (Korale/Urochloa ramosa) is a rare and ancient millet variety with superior nutritional density. It is highly drought-resistant, traditionally grown in Karnataka and Andhra Pradesh.",
        "benefits": [
            "Exceptionally high fiber content (12.5g per 100g) supports digestive health and weight management",
            "Rich in B-vitamins (niacin, thiamine) that support metabolism and energy production",
            "Contains significant calcium and iron, supporting bone density and blood health",
            "Gluten-free and low-GI, making it suitable for diabetic and gluten-sensitive individuals"
        ],
        "uses": [
            "Cooked as a rice replacement \u2014 prepared as millet rice, pongal, and pulao",
            "Ground into flour for making rustic rotis, dosas, and traditional Karnataka dishes",
            "Used in porridge preparations for babies and elderly individuals",
            "Germinated and used in health drinks and malt-based nutritional preparations"
        ],
        "nutritional_facts": "Per 100g: Calories 342 kcal, Protein 11.5g, Fat 4.2g, Carbohydrates 65.5g, Fiber 12.5g, Iron 0.5mg, Calcium 11mg, Magnesium 114mg",
        "storage": "Store in an airtight container in a cool, dry, dark place. Protect from insects and moisture. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-02.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Navane \u2013 Fox Tail Millet (Unpolished)",
        "slug": "navane-foxtail-millet",
        "sort_order": 36,
        "collection": "unpolished-millets",
        "price": 110,
        "compare_price": 150,
        "stock": 50,
        "description": "Unpolished fox tail millet (Navane/Thinai/Setaria italica) is one of the oldest cultivated millets in India, highly valued for its nutritional density and low glycemic index. It is a staple grain in many South Indian diets.",
        "benefits": [
            "Excellent source of complex carbohydrates providing slow-release energy and reducing hunger",
            "Rich in iron and B12-supporting nutrients, helping combat anemia and energy deficiency",
            "Low glycemic index regulates blood sugar spikes, ideal for diabetics",
            "High magnesium content supports heart health, blood pressure regulation, and muscle function"
        ],
        "uses": [
            "Cooked as a rice substitute \u2014 used in khichdi, pongal, and millet pulao",
            "Ground into flour and used for dosas, idlis, rotis, and traditional millet upma",
            "Used in traditional South Indian Navane kanji (porridge) as a weaning food for babies",
            "Malted and used in health drinks and energy bars for athletes and active individuals"
        ],
        "nutritional_facts": "Per 100g: Calories 331 kcal, Protein 12.3g, Fat 4.3g, Carbohydrates 60.9g, Fiber 8g, Iron 2.8mg, Calcium 31mg, Magnesium 81mg",
        "storage": "Store in a sealed container away from moisture, heat, and sunlight. Refrigerate to prevent insect infestation in humid climates. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-03.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Aarka \u2013 Kodo Millet (Unpolished)",
        "slug": "aarka-kodo-millet",
        "sort_order": 37,
        "collection": "unpolished-millets",
        "price": 130,
        "compare_price": 170,
        "stock": 40,
        "description": "Kodo millet (Aarka/Kodon/Paspalum scrobiculatum) is an ancient hardy millet grain that thrives in dryland agriculture. Unpolished kodo retains its bran and is prized for its high fiber, low fat, and diabetes-friendly properties.",
        "benefits": [
            "Exceptionally high in fiber (9g per 100g), regulating bowel movement and preventing constipation",
            "Very low fat content and low GI make it one of the best grains for weight management",
            "Rich in polyphenols and tannins with strong antioxidant and anti-diabetic properties",
            "Contains significant magnesium and phosphorus supporting bone strength and nerve function"
        ],
        "uses": [
            "Cooked as rice replacement in khichdi, pongal, and simple steamed grain meals",
            "Ground into flour for traditional Karnataka recipes like roti and dosa",
            "Cooked as porridge for diabetic individuals as a nutritious, filling meal",
            "Germinated and used in malt preparations for infants and elderly individuals"
        ],
        "nutritional_facts": "Per 100g: Calories 309 kcal, Protein 8.3g, Fat 1.4g, Carbohydrates 65.9g, Fiber 9g, Iron 0.5mg, Calcium 27mg, Phosphorus 188mg",
        "storage": "Store in an airtight container in a cool, dry, dark place. Protect from moisture and insects. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-04.png"],
        "tags": ["bestseller"]
    },

    {
        "name": "Oodalu – Barnyard Millet (Unpolished)",
        "slug": "oodalu-barnyard-millet",
        "sort_order": 39,
        "collection": "unpolished-millets",
        "price": 115,
        "compare_price": 155,
        "stock": 45,
        "description": "Unpolished barnyard millet (Oodalu/Samak/Echinochloa frumentacea) is a fast-growing ancient millet with one of the highest fiber contents among all millets. It is widely used during fasting periods and as a nutritious grain substitute.",
        "benefits": [
            "Exceptionally high dietary fiber (10-13g per 100g) — supports digestive health and sustained fullness",
            "Very low calorie density and high water absorption make it ideal for weight management",
            "Rich in iron and zinc, supporting blood health and immune function",
            "Gluten-free and easy to digest, safe for celiac disease and gluten sensitivities"
        ],
        "uses": [
            "Cooked as a rice substitute — used in pongal, khichdi, and plain steamed grain meals",
            "Traditionally consumed during Hindu fasting periods as a nutritious grain alternative",
            "Ground into flour for making flatbreads, pancakes, and porridges",
            "Used as a baby food grain due to its easy digestibility and nutritional density"
        ],
        "nutritional_facts": "Per 100g: Calories 307 kcal, Protein 6.2g, Fat 2.2g, Carbohydrates 65g, Fiber 13.6g, Iron 5mg, Calcium 20mg, Magnesium 82mg",
        "storage": "Store in an airtight container in a cool, dry, dark place. Protect from moisture and insects. Shelf life: 6-12 months.",
        "images": ["https://images.unsplash.com/photo-1634141510639-d691d86f47be?w=1200"],
        "tags": []
    },
    {
        "name": "Quinoa",
        "slug": "quinoa",
        "sort_order": 41,
        "collection": "unpolished-millets",
        "price": 350,
        "compare_price": 430,
        "stock": 30,
        "description": "Quinoa (Chenopodium quinoa) is a nutrient-dense pseudocereal from the Andes, now grown in India. It is one of the few plant foods that contains all nine essential amino acids, making it a complete protein source.",
        "benefits": [
            "Complete plant protein with all 9 essential amino acids — ideal for vegetarians and vegans",
            "High in fiber, magnesium, B-vitamins, iron, and antioxidants like quercetin and kaempferol",
            "Gluten-free grain with a low glycemic index, suitable for diabetics and celiac patients",
            "Anti-inflammatory properties from quercetin and betaine support heart and metabolic health"
        ],
        "uses": [
            "Cooked as a rice or grain substitute in salads, grain bowls, and pilafs",
            "Used in South Indian preparations like quinoa idli, dosa batter, and pongal",
            "Prepared as a protein-rich breakfast porridge with nuts, honey, and fruits",
            "Added to soups, stews, and vegetable dishes as a nutritious thickener"
        ],
        "nutritional_facts": "Per 100g (cooked): Calories 120 kcal, Protein 4.4g, Fat 1.9g, Carbohydrates 21.3g, Fiber 2.8g, Iron 1.5mg, Magnesium 64mg, All 9 essential amino acids",
        "storage": "Store uncooked quinoa in an airtight container in a cool, dry place. Shelf life: 2-3 years. After cooking, refrigerate and use within 5 days.",
        "images": ["https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?w=1200"],
        "tags": []
    },

    # ── Jaggery & Rock Salt ────────────────────────────────────────────────
    {
        "name": "Organic Jaggery",
        "slug": "organic-jaggery",
        "sort_order": 27,
        "collection": "jaggery-rocksalt",
        "price": 150,
        "compare_price": 200,
        "stock": 50,
        "description": "Organic jaggery is unrefined whole cane sugar made by boiling and cooling sugarcane juice without any chemicals, bleaches, or additives. It retains the natural mineral content of sugarcane and has been used in Indian cooking for centuries.",
        "benefits": [
            "Natural source of iron, potassium, and magnesium not found in refined white sugar",
            "Stimulates digestive enzymes, relieves constipation, and promotes healthy gut bacteria",
            "Acts as a natural liver detoxifier by flushing out toxins from the body",
            "Provides a slower glucose release than refined sugar, reducing drastic blood sugar spikes"
        ],
        "uses": [
            "Used as a natural sweetener in Indian sweets, ladoos, halwa, and payasam",
            "Added to rasam, sambar, and tamarind-based dishes to balance acidity and add depth",
            "Consumed with warm water or ginger tea after meals to aid digestion",
            "Used in traditional remedies for cold, cough, and respiratory relief with ginger and tulsi"
        ],
        "nutritional_facts": "Per 100g: Calories 383 kcal, Carbohydrates 98.96g, Sugar 92.5g, Iron 11mg, Calcium 80mg, Magnesium 160mg, Potassium 1050mg, Phosphorus 40mg",
        "storage": "Store in an airtight container away from moisture. Keep in a cool, dry place. Avoid refrigeration. Shelf life: 3-6 months.",
        "images": ["/images/products/lifestyle-05.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Jaggery Powder",
        "slug": "jaggery-powder",
        "sort_order": 21,
        "collection": "jaggery-rocksalt",
        "price": 180,
        "compare_price": 230,
        "stock": 45,
        "description": "Jaggery powder is finely granulated organic jaggery made from freshly pressed sugarcane juice without any chemicals or bleaching agents. It dissolves easily in liquids, making it a convenient natural sweetener for everyday use.",
        "benefits": [
            "Retains all natural minerals of sugarcane \u2014 iron, calcium, potassium \u2014 unlike refined sugar",
            "Easier and faster to dissolve than solid jaggery, making it ideal for beverages and baking",
            "Moderate GI release compared to refined sugar helps avoid sharp blood sugar spikes",
            "Supports liver detoxification and helps cleanse the digestive tract naturally"
        ],
        "uses": [
            "Used as a direct sugar substitute in tea, coffee, milk, and health drinks",
            "Used in baking \u2014 added to cakes, cookies, and energy bars as a natural sweetener",
            "Mixed into traditional Indian sweets, laddoos, and halwa preparations",
            "Blended into smoothies and protein shakes as a healthier natural sweetener"
        ],
        "nutritional_facts": "Per 100g: Calories 375 kcal, Carbohydrates 97g, Sugar 95g, Iron 2.5mg, Calcium 40mg, Magnesium 70mg, Potassium 200mg",
        "storage": "Store in an airtight container in a cool, dry place. Avoid moisture exposure (it clumps). Do not refrigerate. Shelf life: 3-4 months.",
        "images": ["/images/products/lifestyle-06.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Palm Jaggery",
        "slug": "palm-jaggery",
        "sort_order": 23,
        "collection": "jaggery-rocksalt",
        "price": 220,
        "compare_price": 280,
        "stock": 35,
        "description": "Palm jaggery (Karupatti) is unrefined sweetener made from the sap of palmyra or date palm trees, concentrated without chemicals. It is darker and richer than cane jaggery and is especially popular in Tamil Nadu and Kerala.",
        "benefits": [
            "Higher mineral content than cane jaggery \u2014 particularly rich in calcium and iron from palm sap",
            "Contains natural sucrose that provides slower energy release, avoiding sharp glucose spikes",
            "Traditional remedy for respiratory ailments \u2014 effective for cough, cold, and throat infections",
            "Alkaline nature helps neutralize acidity in the body and supports liver detoxification"
        ],
        "uses": [
            "Used in traditional South Indian sweets \u2014 appam, karupatti coffee, and palm jaggery payasam",
            "Added to karupatti coffee or herbal tea as a warming, healthy sweetener",
            "Consumed directly as a post-meal digestive aid and energy booster",
            "Used in Ayurvedic formulations for treating anemia, cold, and respiratory conditions"
        ],
        "nutritional_facts": "Per 100g: Calories 390 kcal, Carbohydrates 96g, Sugar 95g, Iron 11mg, Calcium 100mg, Phosphorus 30mg, Potassium 180mg, Magnesium 40mg",
        "storage": "Store in an airtight container in a cool, dry place. Avoid direct sunlight and moisture. Shelf life: 3-6 months.",
        "images": ["/images/products/lifestyle-07.png"],
        "tags": []
    },
    {
        "name": "Bucket Jaggery (Solid)",
        "slug": "bucket-jaggery",
        "sort_order": 22,
        "collection": "jaggery-rocksalt",
        "price": 250,
        "compare_price": 320,
        "stock": 30,
        "description": "Bucket jaggery (solid jaggery blocks) are made by pouring boiled sugarcane juice into cylindrical molds or buckets, creating large, dense blocks of unrefined natural sweetener without any chemical additives.",
        "benefits": [
            "Unrefined natural sweetener that retains all sugarcane minerals including iron, calcium, and potassium",
            "Free from sulfur, chemicals, and artificial additives common in commercial jaggery",
            "Provides steady energy release and is used as a natural pre/post-workout energy source",
            "Traditional digestive aid \u2014 consumption after meals supports healthy digestion and detoxification"
        ],
        "uses": [
            "Used as a primary sweetener in traditional Indian homes for tea, sweets, and cooking",
            "Broken into pieces and offered as prasad in temples and during festivals",
            "Added to tamarind-based gravies, chutneys, and sambar to balance sourness and add depth",
            "Dissolved in warm water as jaggery water \u2014 a traditional detox and energy drink"
        ],
        "nutritional_facts": "Per 100g: Calories 383 kcal, Carbohydrates 98.96g, Sugar 92.5g, Iron 11mg, Calcium 80mg, Magnesium 160mg, Potassium 1050mg",
        "storage": "Wrap in cloth or paper and store in a cool, dry place away from moisture. Avoid refrigeration. Shelf life: 3-6 months.",
        "images": ["/images/products/lifestyle-09.png"],
        "tags": []
    },
    {
        "name": "Rock Salt \u2013 Pink Crystal",
        "slug": "rock-salt-crystal",
        "sort_order": 25,
        "collection": "jaggery-rocksalt",
        "price": 80,
        "compare_price": 120,
        "stock": 50,
        "description": "Himalayan pink rock salt in crystal form, mined from ancient Jurassic-era sea beds in the Khewra mines of Pakistan. It contains 84+ trace minerals giving it a distinctive pink hue and superior mineral profile over common table salt.",
        "benefits": [
            "Contains 84+ trace minerals including calcium, magnesium, potassium, and iron supporting overall health",
            "Natural, unrefined, and free from anti-caking agents and chemicals added to processed table salt",
            "May support electrolyte balance, hydration, and proper pH regulation in the body",
            "Used in salt therapy (halotherapy) for respiratory relief from asthma and sinus conditions"
        ],
        "uses": [
            "Used as a cooking and finishing salt, added to dishes for mineral-rich flavor",
            "Used to make rock salt lamps for ambient lighting and purported air ionization benefits",
            "Dissolved in warm water for salt water gargling to soothe sore throats",
            "Used in Ayurvedic salt therapy baths (Saindhava Snana) for skin and muscle relaxation"
        ],
        "nutritional_facts": "Per 1g: Sodium 368mg, 84+ trace minerals including Calcium 1.6mg, Magnesium 1.06mg, Potassium 2.8mg, Iron 0.0369mg. Sodium content slightly lower than table salt.",
        "storage": "Store in an airtight container away from moisture. Rock salt absorbs humidity \u2014 use a sealed jar. Shelf life: Indefinite if kept dry.",
        "images": ["/images/products/sesame-seeds-2.png", "/images/products/sesame-seeds-3.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Rock Salt \u2013 Pink Powder",
        "slug": "rock-salt-powder",
        "sort_order": 26,
        "collection": "jaggery-rocksalt",
        "price": 90,
        "compare_price": 130,
        "stock": 50,
        "description": "Himalayan pink rock salt ground into fine powder form, sourced from ancient Himalayan salt mines. It is unprocessed, chemical-free, and rich in trace minerals, offering the same benefits as crystal form with the convenience of a fine powder.",
        "benefits": [
            "Contains 84+ trace minerals providing a natural mineral supplement with every use",
            "Free from chemical additives, anti-caking agents, and bleaching agents in table salt",
            "Finer texture makes it easy to dissolve and ideal for cooking, baking, and beverages",
            "Supports better electrolyte absorption and hydration compared to refined table salt"
        ],
        "uses": [
            "Used as an everyday cooking salt \u2014 in curries, rice, dals, and all regular dishes",
            "Added to lemon water, buttermilk, and electrolyte drinks for mineral-rich hydration",
            "Used as a finishing salt on salads, fruit chaat, and grilled vegetables",
            "Dissolved in warm water for therapeutic gargling and nasal rinse (neti pot use)"
        ],
        "nutritional_facts": "Per 1g: Sodium 368mg, Trace minerals including Calcium 1.6mg, Magnesium 1.06mg, Potassium 2.8mg. Slightly lower sodium than regular table salt.",
        "storage": "Store in a sealed airtight container. Keep away from moisture and humidity. Shelf life: Indefinite if stored dry.",
        "images": ["/images/products/sesame-seeds-4.png", "/images/products/sesame-seeds-6.png"],
        "tags": ["bestseller"]
    },

    {
        "name": "Organic Jaggery Round",
        "slug": "organic-jaggery-round",
        "sort_order": 24,
        "collection": "jaggery-rocksalt",
        "price": 160,
        "compare_price": 210,
        "stock": 40,
        "description": "Organic jaggery in traditional round (goli) form, made by pouring hot sugarcane juice into round molds and allowing it to set naturally. Each round is a single-use block of unrefined, chemical-free sweetener.",
        "benefits": [
            "Unrefined whole cane sugar retaining natural iron, calcium, and magnesium",
            "Traditional round form preserves the jaggery better with less surface area exposed to air",
            "Slower energy release than refined sugar, reducing blood glucose spikes",
            "Acts as a natural digestive aid and liver cleanser when consumed after meals"
        ],
        "uses": [
            "Used as a traditional sweetener in South Indian cooking — sambar, chutneys, and sweets",
            "Added whole to curries and tamarind-based gravies for controlled sweetening",
            "Dissolved in warm water or tea as a healthy alternative to refined sugar",
            "Offered as prasad in temples and during festivals in traditional round form"
        ],
        "nutritional_facts": "Per 100g: Calories 383 kcal, Carbohydrates 98.96g, Sugar 92.5g, Iron 11mg, Calcium 80mg, Magnesium 160mg, Potassium 1050mg",
        "storage": "Store wrapped in paper or cloth in a cool, dry place. Avoid moisture. Shelf life: 3-6 months.",
        "images": ["/images/products/lifestyle-07.png"],
        "tags": []
    },

    # ── Spices ─────────────────────────────────────────────────────────────
    {
        "name": "Turmeric Powder",
        "slug": "turmeric-powder",
        "sort_order": 52,
        "collection": "spices",
        "price": 180,
        "compare_price": 240,
        "stock": 50,
        "description": "Organic turmeric powder from high-curcumin Salem or Erode turmeric roots, dried and stone-ground without chemicals or artificial colors. A cornerstone of Ayurvedic medicine, used in cooking, beauty, and healing for thousands of years.",
        "benefits": [
            "Curcumin \u2014 the active compound \u2014 is one of the most potent natural anti-inflammatories known to science",
            "Powerful antioxidant that neutralizes free radicals and boosts the body's own antioxidant defenses",
            "Supports liver health, aids bile production, and helps detoxify the body naturally",
            "Antimicrobial and wound-healing properties make it effective for skin infections and injuries"
        ],
        "uses": [
            "Used daily in Indian cooking \u2014 added to curries, dals, rice, and vegetable dishes",
            "Mixed with warm milk (golden milk / turmeric latte) as an anti-inflammatory health drink",
            "Applied as a face mask with honey or yogurt for brightening and anti-acne benefits",
            "Used in Ayurvedic wound care \u2014 applied with coconut oil on minor cuts and burns"
        ],
        "nutritional_facts": "Per 100g: Calories 354 kcal, Carbohydrates 64.9g, Protein 7.8g, Fat 9.9g, Fiber 21.1g, Curcumin 3-5g, Iron 55mg, Calcium 182mg, Potassium 2080mg",
        "storage": "Store in an airtight glass container away from sunlight and moisture. Keep in a cool, dark place. Shelf life: 12-24 months.",
        "images": ["/images/products/lifestyle-img1.jpg"],
        "tags": ["bestseller"]
    },
    {
        "name": "Chilli Powder",
        "slug": "chilli-powder",
        "sort_order": 51,
        "collection": "spices",
        "price": 160,
        "compare_price": 210,
        "stock": 45,
        "description": "Stone-ground red chilli powder made from sun-dried Byadagi, Guntur, or Kashmiri red chillies. It adds color, heat, and flavor to Indian cooking and contains capsaicin with documented health benefits.",
        "benefits": [
            "Capsaicin boosts metabolism by thermogenic effect \u2014 supports calorie burning and weight management",
            "Rich in Vitamin C and Vitamin A, supporting immune function and eye health",
            "Natural pain-relieving properties of capsaicin used topically for muscle and joint pain",
            "Antimicrobial properties protect food from spoilage and combat foodborne pathogens"
        ],
        "uses": [
            "Used as a primary spice in all Indian curries, sambar, rasam, and rice dishes",
            "Added to marinades, spice rubs, and dry masala blends for meats and vegetables",
            "Mixed with lemon and salt for traditional chaat masala and snack seasonings",
            "Used in pickling spice mixes for traditional Indian achaar (pickles)"
        ],
        "nutritional_facts": "Per 100g: Calories 314 kcal, Carbohydrates 56.6g, Protein 12.0g, Fat 17g, Fiber 27.2g, Vitamin C 76.4mg, Vitamin A 21000 IU, Iron 34.1mg, Capsaicin 0.1-1g",
        "storage": "Store in an airtight container away from light, heat, and moisture. Refrigerate for longer shelf life. Best used within 12 months.",
        "images": ["/images/products/lifestyle-img2.jpg"],
        "tags": ["bestseller"]
    },
    {
        "name": "Sambhar Powder",
        "slug": "sambhar-powder",
        "sort_order": 53,
        "collection": "spices",
        "price": 200,
        "compare_price": 260,
        "stock": 40,
        "description": "Traditional South Indian sambhar powder made from a blend of sun-dried and roasted spices including coriander seeds, cumin, red chillies, chana dal, urad dal, peppercorns, curry leaves, and turmeric. A kitchen essential for authentic sambhar and curries.",
        "benefits": [
            "Rich blend of digestive spices \u2014 cumin, coriander, and pepper \u2014 that improve digestion and reduce bloating",
            "Contains curcumin from turmeric and piperine from black pepper \u2014 the combination maximizes anti-inflammatory absorption",
            "Antioxidant-rich combination of spices protects against oxidative stress and supports immunity",
            "Provides a complete aromatic spice profile with antibacterial and carminative properties from individual herbs"
        ],
        "uses": [
            "Primary spice for making traditional South Indian sambhar with vegetables and tamarind",
            "Used in dry vegetable preparations, mixed rice dishes, and lentil curries",
            "Added to buttermilk-based gravies (mor kuzhambu) and spiced lentil soups",
            "Used as a seasoning for roasted vegetables, poha, and mixed millet dishes"
        ],
        "nutritional_facts": "Per 100g (approx blend): Calories 330 kcal, Carbohydrates 50g, Protein 13g, Fat 12g, Fiber 22g, Iron 17mg, Calcium 470mg, Vitamin C 25mg, Curcumin present",
        "storage": "Store in a dry, airtight glass jar away from heat and humidity. Do not use wet spoons. Shelf life: 6-12 months.",
        "images": ["https://images.unsplash.com/photo-1512058564366-18510be2db19?w=1200"],
        "tags": ["bestseller"]
    },

    {
        "name": "Coriander Powder",
        "slug": "coriander-powder",
        "sort_order": 55,
        "collection": "spices",
        "price": 140,
        "compare_price": 190,
        "stock": 45,
        "description": "Stone-ground coriander powder from whole dried coriander seeds (Coriandrum sativum). A foundational spice in Indian cooking with a warm, citrusy aroma and mild flavor.",
        "benefits": [
            "Rich in antioxidants including quercetin and tocopherols that fight oxidative stress",
            "Supports digestion by stimulating enzyme secretion and reducing bloating and gas",
            "Natural blood sugar-lowering properties beneficial for diabetics",
            "Anti-inflammatory and antimicrobial properties support overall immune health"
        ],
        "uses": [
            "Used as a primary spice in curries, dals, chutneys, and rice preparations",
            "Added to marinades, spice rubs, and masala blends for depth of flavor",
            "Mixed with cumin for the classic Indian 'dhania-jeera' spice combination",
            "Used in traditional Ayurvedic remedies for digestive complaints and bloating"
        ],
        "nutritional_facts": "Per 100g: Calories 298 kcal, Carbohydrates 55g, Protein 12.4g, Fat 17.8g, Fiber 41.9g, Iron 16.3mg, Calcium 709mg, Magnesium 330mg",
        "storage": "Store in an airtight glass jar away from heat, moisture, and sunlight. Shelf life: 12-18 months.",
        "images": ["/images/products/lifestyle-img4.jpg"],
        "tags": ["bestseller"]
    },
    {
        "name": "Jeera Powder",
        "slug": "jeera-powder",
        "sort_order": 56,
        "collection": "spices",
        "price": 180,
        "compare_price": 230,
        "stock": 40,
        "description": "Stone-ground cumin powder from premium whole cumin seeds (Cuminum cyminum). An essential spice in Indian, Middle Eastern, and Mexican cooking with a warm, earthy, and slightly peppery flavor.",
        "benefits": [
            "Thymoquinone in cumin has potent anti-inflammatory and antioxidant properties",
            "Stimulates digestive enzymes and bile secretion, improving digestion and reducing IBS symptoms",
            "Supports iron absorption and is one of the best plant sources of iron per gram",
            "Antimicrobial properties help protect against foodborne pathogens"
        ],
        "uses": [
            "Used in tempering (tadka) for dals, curries, rice, and vegetable dishes",
            "Mixed with coriander powder for dhania-jeera blend used in almost all Indian cooking",
            "Added to yogurt-based raita, buttermilk, and lemon water for digestive benefit",
            "Used in cumin-spiced breads, crackers, and savory baked goods"
        ],
        "nutritional_facts": "Per 100g: Calories 375 kcal, Carbohydrates 44g, Protein 17.8g, Fat 22.3g, Fiber 10.5g, Iron 66.4mg, Calcium 931mg, Magnesium 366mg",
        "storage": "Store in an airtight glass jar away from heat and moisture. Best within 12-18 months for peak flavor.",
        "images": ["/images/products/lifestyle-img5.jpg"],
        "tags": []
    },
    {
        "name": "Vaangi Bath Powder",
        "slug": "vaangi-bath-powder",
        "sort_order": 54,
        "collection": "spices",
        "price": 210,
        "compare_price": 270,
        "stock": 35,
        "description": "Traditional Karnataka-style vaangi bath (brinjal rice) masala powder made from a blend of roasted spices including chana dal, urad dal, red chillies, coriander, sesame, and coconut. An authentic home-style spice mix.",
        "benefits": [
            "Complex spice blend provides a wide range of antioxidants from multiple spice sources",
            "Contains sesame and coconut for healthy fats and anti-inflammatory compounds",
            "Aromatic spices support digestion and reduce bloating when consumed regularly",
            "Made without artificial additives or preservatives — pure, natural spice blend"
        ],
        "uses": [
            "Primary masala for making traditional Karnataka vaangi bath (spiced brinjal rice)",
            "Used in mixed vegetable rice, capsicum bath, and other masala rice preparations",
            "Added to sabzis and curries for a rich, traditional Karnataka flavor profile",
            "Used as a seasoning for roasted vegetables and snack preparations"
        ],
        "nutritional_facts": "Per 100g (approx blend): Calories 340 kcal, Carbohydrates 45g, Protein 14g, Fat 15g, Fiber 18g",
        "storage": "Store in a dry, airtight glass jar away from heat and humidity. Shelf life: 6-12 months.",
        "images": ["https://images.unsplash.com/photo-1576086213369-97a306d36557?w=1200"],
        "tags": []
    },
    {
        "name": "Puliogare Powder",
        "slug": "puliogare-powder",
        "sort_order": 57,
        "collection": "spices",
        "price": 190,
        "compare_price": 250,
        "stock": 40,
        "description": "Traditional South Indian tamarind rice (puliogare/puliyodarai) masala powder made from a blend of mustard, sesame, dried red chillies, curry leaves, asafoetida, and spices. An authentic temple-style recipe.",
        "benefits": [
            "Rich combination of spices provides antioxidants and anti-inflammatory compounds",
            "Tamarind in the preparation aids digestion and provides natural tartaric acid",
            "Sesame in the blend provides calcium and healthy fats",
            "Traditional preparation without artificial preservatives or colors"
        ],
        "uses": [
            "Mixed with cooked rice and tamarind paste to make traditional puliogare (tamarind rice)",
            "Used as a seasoning for snacks, poha, and mixed grain preparations",
            "Added to curries and dals for a tangy, spiced flavor profile",
            "Used in traditional temple prasad preparations for puliogare"
        ],
        "nutritional_facts": "Per 100g (approx blend): Calories 350 kcal, Carbohydrates 48g, Protein 12g, Fat 16g, Fiber 20g",
        "storage": "Store in an airtight glass jar away from moisture and heat. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-img2.jpg"],
        "tags": []
    },
    {
        "name": "Bisibelebath Powder",
        "slug": "bisibelebath-powder",
        "sort_order": 58,
        "collection": "spices",
        "price": 220,
        "compare_price": 280,
        "stock": 35,
        "description": "Authentic Karnataka-style bisibelebath powder, a complex spice blend for the classic rice-dal-vegetable dish. Contains coriander, cumin, red chillies, cloves, cinnamon, marathi mokku, and other aromatic spices.",
        "benefits": [
            "Complex blend of warming spices supports digestion and stimulates appetite",
            "Cloves and cinnamon provide natural antimicrobial and anti-inflammatory benefits",
            "Traditional preparation without additives — pure whole-spice flavors",
            "High-antioxidant spice combination from multiple plant sources"
        ],
        "uses": [
            "Primary spice blend for making traditional Karnataka bisibelebath",
            "Used in rice-dal combinations, vegetable stews, and mixed grain preparations",
            "Added to curries and sambar for a richer, more complex flavor",
            "Used in traditional Karnataka festive cooking and temple food preparations"
        ],
        "nutritional_facts": "Per 100g (approx blend): Calories 345 kcal, Carbohydrates 50g, Protein 13g, Fat 14g, Fiber 19g",
        "storage": "Store in a dry, airtight glass jar. Keep away from heat and moisture. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-img3.jpg"],
        "tags": []
    },
    {
        "name": "Rasam Powder",
        "slug": "rasam-powder",
        "sort_order": 59,
        "collection": "spices",
        "price": 170,
        "compare_price": 220,
        "stock": 40,
        "description": "Traditional South Indian rasam powder made from a blend of black pepper, cumin, red chillies, coriander, and curry leaves. The foundation spice for the light, digestive pepper broth called rasam.",
        "benefits": [
            "Black pepper and cumin provide piperine and thymoquinone with potent antioxidant effects",
            "Traditional digestive preparation — rasam made with this powder aids digestion and relieves congestion",
            "Anti-inflammatory compounds from black pepper and coriander support immunity",
            "Natural preparation without additives — pure spice blend with authentic flavor"
        ],
        "uses": [
            "Used to prepare traditional South Indian rasam (pepper broth) with tamarind and tomato",
            "Mixed into tomato-based soups for an authentic South Indian flavor",
            "Added to dal and curries for a peppery, aromatic depth",
            "Used in Ayurvedic preparations for cold and congestion relief"
        ],
        "nutritional_facts": "Per 100g (approx blend): Calories 325 kcal, Carbohydrates 52g, Protein 13g, Fat 11g, Fiber 22g",
        "storage": "Store in an airtight glass jar away from heat and humidity. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-img4.jpg"],
        "tags": []
    },
    {
        "name": "Groundnut Chutney Powder",
        "slug": "groundnut-chutney-powder",
        "sort_order": 50,
        "collection": "spices",
        "price": 150,
        "compare_price": 200,
        "stock": 45,
        "description": "Traditional peanut chutney powder (shenga chutney pudi) made from roasted groundnuts, dried coconut, red chillies, garlic, and seasoning. A staple condiment in Karnataka homes.",
        "benefits": [
            "High protein content from groundnuts provides sustained energy and satiety",
            "Contains healthy monounsaturated and polyunsaturated fats from peanuts",
            "Coconut adds medium-chain triglycerides and natural antimicrobial properties",
            "Rich in niacin, magnesium, and vitamin E from groundnuts"
        ],
        "uses": [
            "Served as a dry chutney with idli, dosa, upma, and vada",
            "Sprinkled on plain rice with oil or ghee as a quick, flavorful meal",
            "Used as a spice coating for roasted potatoes, corn, and snacks",
            "Mixed into jowar or bajra roti dough for added flavor and nutrition"
        ],
        "nutritional_facts": "Per 100g: Calories 490 kcal, Protein 18g, Fat 35g, Carbohydrates 30g, Fiber 8g, Iron 2.5mg, Calcium 60mg",
        "storage": "Store in an airtight container away from moisture and sunlight. Refrigerate for extended shelf life. Consume within 30-45 days.",
        "images": ["/images/products/sesame-seeds-bowl.jpg"],
        "tags": ["bestseller"]
    },
    {
        "name": "Nigerseed Powder",
        "slug": "nigerseed-powder",
        "sort_order": 60,
        "collection": "spices",
        "price": 200,
        "compare_price": 260,
        "stock": 30,
        "description": "Roasted and ground niger seed (Guizotia abyssinica / ramtil) powder, traditionally used as a dry chutney powder and spice condiment in Karnataka and Maharashtra. Has a distinctive nutty, slightly bitter flavor.",
        "benefits": [
            "Rich in linoleic acid (omega-6) supporting skin health and reducing inflammation",
            "Contains natural antioxidants including tocopherols that protect cellular health",
            "Traditionally used in Ayurveda for joint lubrication and arthritis management",
            "High in protein and healthy fats providing sustained energy and satiety"
        ],
        "uses": [
            "Served as a dry chutney powder with idli, dosa, and rice",
            "Mixed into jowar or bajra roti preparations for flavor and nutrition",
            "Used as a spice condiment sprinkled over steamed rice with oil",
            "Added to traditional Karnataka chutneys and mixed dry condiment powders"
        ],
        "nutritional_facts": "Per 100g: Calories 500 kcal, Protein 20g, Fat 38g (Linoleic acid 70%), Carbohydrates 22g, Fiber 14g, Vitamin E 5mg",
        "storage": "Store in an airtight glass jar away from heat and moisture. Shelf life: 2-3 months after opening.",
        "images": ["/images/products/sesame-seeds-2.png"],
        "tags": []
    },

    # ── Pulses ─────────────────────────────────────────────────────────────
    {
        "name": "Toor Dal",
        "slug": "toor-dal",
        "sort_order": 42,
        "collection": "spices",
        "price": 160,
        "compare_price": 210,
        "stock": 50,
        "description": "Whole unpolished toor dal (pigeon pea / arhar dal) with the skin intact, retaining its natural fiber, protein, and mineral content. A staple legume in Indian cooking used in sambar, dal, and rasam.",
        "benefits": [
            "Rich in plant protein with all essential amino acids, supporting muscle health",
            "High dietary fiber content regulates blood sugar and supports digestive health",
            "Good source of folic acid, iron, and potassium supporting heart health and pregnancy",
            "Low glycemic index makes it suitable for diabetics and weight management"
        ],
        "uses": [
            "Primary ingredient for South Indian sambar and North Indian dal tadka",
            "Used in khichdi preparations with rice for a complete protein meal",
            "Cooked with tamarind and spices for traditional rasam preparations",
            "Ground into besan (gram flour) for use in fritters and lentil-based dishes"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 343 kcal, Protein 22.3g, Fat 1.5g, Carbohydrates 62.7g, Fiber 15g, Iron 5.2mg, Calcium 73mg, Folic acid 456mcg",
        "storage": "Store in an airtight container in a cool, dry place. Protect from moisture and weevils. Shelf life: 12 months.",
        "images": ["/images/products/lifestyle-01.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Channa Dal",
        "slug": "channa-dal",
        "sort_order": 43,
        "collection": "spices",
        "price": 140,
        "compare_price": 190,
        "stock": 50,
        "description": "Split chickpea dal (chana dal / Bengal gram) with bran partially retained for maximum fiber and nutrition. A versatile lentil used in South Indian and North Indian cooking for dals, chutneys, and sweets.",
        "benefits": [
            "One of the lowest glycemic index dals — ideal for diabetics and blood sugar management",
            "High in protein and fiber, providing sustained energy and reducing hunger",
            "Rich in folic acid, manganese, and B vitamins supporting metabolic and neural health",
            "Natural prebiotics feed beneficial gut bacteria, improving digestive microbiome health"
        ],
        "uses": [
            "Used in traditional South Indian chutneys as a roasted base ingredient",
            "Cooked as dal with spices for a protein-rich main course dish",
            "Used in Karnataka-style dal preparations like chana dal sambar and vada",
            "Ground into flour (besan) for making pakoras, chilla, and traditional sweets"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 364 kcal, Protein 20.5g, Fat 5.6g, Carbohydrates 60.8g, Fiber 17.4g, Iron 4.9mg, Folic acid 557mcg",
        "storage": "Store in an airtight container in a cool, dry place. Shelf life: 12 months.",
        "images": ["/images/products/lifestyle-02.png"],
        "tags": []
    },
    {
        "name": "Moong Dal",
        "slug": "moong-dal",
        "sort_order": 44,
        "collection": "spices",
        "price": 180,
        "compare_price": 230,
        "stock": 50,
        "description": "Whole or split moong dal (green gram / Vigna radiata) in unpolished form retaining the natural green husk. One of the most easily digestible legumes, widely used in Indian cooking and Ayurvedic medicine.",
        "benefits": [
            "Easiest legume to digest — recommended for sick individuals, babies, and the elderly",
            "Rich in antioxidants including vitexin and isovitexin that protect against heat stroke and inflammation",
            "High protein content with a good amino acid profile for vegetarians",
            "Natural antibiotic properties of mung bean extracts have been documented in research"
        ],
        "uses": [
            "Cooked as a simple dal with turmeric and ghee for a light, nutritious meal",
            "Sprouted and used in salads, stir-fries, and health drinks",
            "Prepared as moong dal khichdi for sick individuals and weaning babies",
            "Ground into batter for making moong dal dosa, pesarattu, and cheela"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 347 kcal, Protein 23.9g, Fat 1.2g, Carbohydrates 62.6g, Fiber 16.3g, Iron 6.7mg, Calcium 132mg, Potassium 1246mg",
        "storage": "Store in an airtight container in a cool, dry place away from moisture and insects. Shelf life: 12 months.",
        "images": ["/images/products/lifestyle-03.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Urid Dal",
        "slug": "urid-dal",
        "sort_order": 45,
        "collection": "spices",
        "price": 200,
        "compare_price": 260,
        "stock": 45,
        "description": "Whole or split urad dal (black gram / Vigna mungo) in unpolished form. A key ingredient in South Indian fermented foods and a rich source of protein, calcium, and B-vitamins.",
        "benefits": [
            "Very high in protein and calcium, important for bone health and muscle function",
            "Contains natural digestive enzymes that improve gut motility and digestion",
            "Rich in iron supporting red blood cell production and combating anemia",
            "Essential for healthy fermented foods — the key ingredient for natural fermentation of dosa batter"
        ],
        "uses": [
            "Mixed with rice and fermented to make traditional idli and dosa batter",
            "Cooked as dal makhani with kidney beans for a rich, protein-dense dish",
            "Used in South Indian vada and medu vada preparations",
            "Roasted and used in tempering (tadka) for sambhar, chutneys, and rice dishes"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 341 kcal, Protein 25.1g, Fat 1.6g, Carbohydrates 58.9g, Fiber 18.3g, Iron 7.6mg, Calcium 138mg, Potassium 983mg",
        "storage": "Store in an airtight container in a cool, dry place. Shelf life: 12 months.",
        "images": ["/images/products/lifestyle-04.png"],
        "tags": []
    },
    {
        "name": "Fried Gram",
        "slug": "fried-gram",
        "sort_order": 46,
        "collection": "spices",
        "price": 120,
        "compare_price": 160,
        "stock": 50,
        "description": "Roasted split chickpeas (fried gram / hurigadale / daria) — a crispy, high-protein snack and cooking ingredient widely used in South Indian chutneys, chaat, and as a direct snack.",
        "benefits": [
            "High protein and fiber content provides sustained energy and satiety",
            "Low fat content makes it a healthy snacking alternative to fried snacks",
            "Rich in B vitamins including folate, niacin, and thiamine supporting energy metabolism",
            "Naturally crunchy and satisfying — a healthier alternative to processed packaged snacks"
        ],
        "uses": [
            "Used as the base for traditional South Indian coconut chutney",
            "Eaten directly as a high-protein snack or trail mix ingredient",
            "Ground into besan for making pakoras, kadhi, and traditional sweets",
            "Used in peanut chutney powder and mixed condiment preparations"
        ],
        "nutritional_facts": "Per 100g: Calories 364 kcal, Protein 22g, Fat 5g, Carbohydrates 60g, Fiber 17g, Iron 5mg, Calcium 57mg, Folate 180mcg",
        "storage": "Store in an airtight container in a cool, dry place. Keep away from moisture to preserve crunch. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-05.png"],
        "tags": []
    },
    {
        "name": "Black Urid Dal",
        "slug": "black-urid-dal",
        "sort_order": 47,
        "collection": "spices",
        "price": 210,
        "compare_price": 270,
        "stock": 40,
        "description": "Whole black urad dal (black gram with skin) in unpolished form, retaining the black outer husk rich in fiber and antioxidants. Used in traditional dal makhani and Punjabi cooking.",
        "benefits": [
            "Black husk contains anthocyanins — powerful antioxidants with anti-inflammatory properties",
            "Exceptionally high in protein and calcium, important for bone and muscle health",
            "Promotes gut health through its prebiotic fiber that feeds beneficial bacteria",
            "Rich in iron and magnesium supporting energy metabolism and cardiovascular health"
        ],
        "uses": [
            "Primary ingredient for traditional dal makhani cooked overnight with butter and cream",
            "Used whole in Punjabi and Kashmiri cooking for hearty, protein-rich meals",
            "Soaked and used in South Indian vada and kozhukattai preparations",
            "Roasted whole as a crunchy snack or added to trail mixes"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 347 kcal, Protein 25.1g, Fat 1.6g, Carbohydrates 59g, Fiber 18.3g, Iron 7.6mg, Calcium 138mg, Anthocyanins present",
        "storage": "Store in an airtight container in a cool, dry place. Protect from moisture. Shelf life: 12 months.",
        "images": ["/images/products/lifestyle-06.png"],
        "tags": []
    },
    {
        "name": "Black Channa Dal",
        "slug": "black-channa-dal",
        "sort_order": 48,
        "collection": "spices",
        "price": 150,
        "compare_price": 200,
        "stock": 45,
        "description": "Whole black chickpea (kala channa / desi chick pea) in unpolished form with the dark brown skin intact. Nutritionally superior to white chickpeas with higher fiber, protein, and antioxidant content.",
        "benefits": [
            "Dark skin contains tannins and anthocyanins with strong antioxidant activity",
            "Higher fiber than white chickpeas — better for digestive health and blood sugar control",
            "Rich in plant protein supporting muscle maintenance and satiety",
            "Iron-rich food recommended for vegetarians to prevent iron deficiency anemia"
        ],
        "uses": [
            "Cooked as a main protein dish — channa masala, chole, and black chana curry",
            "Sprouted and eaten as a nutritious snack or salad topping",
            "Prepared as sundal — a traditional South Indian festive protein snack",
            "Ground into a protein-rich flour for healthy baked goods and snacks"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 378 kcal, Protein 19g, Fat 6g, Carbohydrates 61g, Fiber 17g, Iron 6mg, Calcium 105mg, Potassium 875mg",
        "storage": "Store in an airtight container in a cool, dry place. Shelf life: 12 months.",
        "images": ["/images/products/lifestyle-07.png"],
        "tags": []
    },
    {
        "name": "Green Gram",
        "slug": "green-gram",
        "sort_order": 49,
        "collection": "spices",
        "price": 180,
        "compare_price": 240,
        "stock": 45,
        "description": "Whole green gram (whole moong / mung beans) with green skin intact — unpolished and nutrient-dense. One of the most versatile and nutritious legumes in Indian cooking and sprouting.",
        "benefits": [
            "Excellent source of plant protein and all essential amino acids when combined with grains",
            "Easiest legume to sprout — sprouting significantly increases vitamin C and enzyme content",
            "Anti-inflammatory and antioxidant flavonoids protect against chronic disease",
            "High fiber and low glycemic index regulate blood sugar and support weight management"
        ],
        "uses": [
            "Sprouted and eaten fresh in salads, stir-fries, and health drinks",
            "Cooked as whole moong dal or soup for a complete, nutritious meal",
            "Used in traditional South Indian molagootal and kootu preparations",
            "Ground into batter for moong dal cheela, dosa, and pesarattu"
        ],
        "nutritional_facts": "Per 100g (raw): Calories 347 kcal, Protein 23.9g, Fat 1.2g, Carbohydrates 62.6g, Fiber 16.3g, Iron 6.7mg, Calcium 132mg, Vitamin C 4.8mg",
        "storage": "Store in an airtight container in a cool, dry place. Protect from moisture and insects. Shelf life: 12 months.",
        "images": ["/images/products/lifestyle-09.png"],
        "tags": []
    },

    # ── Chikkis ────────────────────────────────────────────────────────────
    {
        "name": "Groundnut Chikki",
        "slug": "groundnut-chikki",
        "sort_order": 61,
        "collection": "chikkis",
        "price": 120,
        "compare_price": 160,
        "stock": 50,
        "description": "Traditional groundnut chikki made with roasted peanuts and organic jaggery, prepared without refined sugar or artificial additives. A beloved Indian energy snack with roots in traditional confectionery.",
        "benefits": [
            "High in protein and healthy fats from peanuts, providing sustained energy and satiety",
            "Jaggery provides natural iron, helping combat anemia and fatigue",
            "Naturally sweetened without refined sugar, making it a healthier snack alternative",
            "Rich in magnesium, phosphorus, and B vitamins that support bone and nerve health"
        ],
        "uses": [
            "Eaten as a mid-day energy snack for both adults and children",
            "Packed as a travel or workout snack due to its high energy and protein content",
            "Offered as prasad in temples or during festivals like Makar Sankranti",
            "Given to children as a nutritious after-school snack"
        ],
        "nutritional_facts": "Per 100g: Calories ~480 kcal, Protein 12g, Fat 22g (MUFA 10g, PUFA 7g), Carbohydrates 58g, Sugar (jaggery) 45g, Iron 2.5mg, Calcium 45mg",
        "storage": "Store in an airtight container at room temperature. Keep away from moisture. Consume within 30-45 days for best crunch and freshness.",
        "images": ["/images/products/lifestyle-img4.jpg"],
        "tags": ["bestseller"]
    },
    {
        "name": "Sesame Chikki",
        "slug": "sesame-chikki",
        "sort_order": 63,
        "collection": "chikkis",
        "price": 140,
        "compare_price": 180,
        "stock": 45,
        "description": "Traditional sesame (gingelly) chikki made by combining roasted white sesame seeds with organic jaggery. A nutritious South Indian sweet rich in calcium, iron, and healthy fats.",
        "benefits": [
            "Sesame seeds provide exceptional calcium content supporting bone and dental health",
            "Jaggery adds natural iron and essential minerals, helping prevent iron-deficiency anemia",
            "Contains sesamin \u2014 a lignan antioxidant with anti-inflammatory and cholesterol-lowering effects",
            "Rich source of plant protein and healthy fats that provide quick energy and satiety"
        ],
        "uses": [
            "Consumed as a traditional festival sweet during Makar Sankranti and Lohri",
            "Eaten as a nutritious snack by women during pregnancy and lactation for calcium intake",
            "Given to children as a natural calcium supplement alternative to processed sweets",
            "Packed as a travel snack for long journeys due to its non-perishable nature"
        ],
        "nutritional_facts": "Per 100g: Calories ~500 kcal, Protein 10g, Fat 26g, Carbohydrates 57g, Calcium 975mg, Iron 14.5mg, Magnesium 346mg, Zinc 7.7mg",
        "storage": "Store in an airtight box or tin at room temperature. Keep away from direct sunlight and moisture. Consume within 30-45 days.",
        "images": ["/images/products/sesame-seeds-bowl.jpg"],
        "tags": []
    },

    {
        "name": "Coco Chikki",
        "slug": "coco-chikki",
        "sort_order": 62,
        "collection": "chikkis",
        "price": 130,
        "compare_price": 170,
        "stock": 40,
        "description": "Traditional coconut chikki made with dried desiccated coconut and organic jaggery, prepared without refined sugar or artificial additives. A delicious South Indian sweet with the natural richness of coconut.",
        "benefits": [
            "Coconut provides medium-chain triglycerides (MCTs) that are quickly metabolized for energy",
            "Jaggery adds natural iron, potassium, and antioxidants not found in refined sugar",
            "Naturally sweetened without refined sugar — a healthier confectionery option",
            "Rich in dietary fiber from coconut supporting digestive health"
        ],
        "uses": [
            "Eaten as a traditional South Indian snack or festive sweet",
            "Packed as a travel snack for its long shelf life and energy content",
            "Given to children as a natural coconut-based energy snack",
            "Offered as prasad at temples and during South Indian festivals"
        ],
        "nutritional_facts": "Per 100g: Calories ~470 kcal, Fat 30g (Saturated 25g, MCTs 15g), Carbohydrates 50g, Sugar (jaggery) 38g, Fiber 5g, Iron 2mg",
        "storage": "Store in an airtight container at room temperature. Keep away from moisture. Consume within 30-45 days.",
        "images": ["https://images.unsplash.com/photo-1603046891744-7617c8f0f9c7?w=1200"],
        "tags": []
    },

    # ── Others ─────────────────────────────────────────────────────────────
    {
        "name": "Shikakai Powder",
        "slug": "shikakai-powder",
        "sort_order": 72,
        "collection": "others",
        "price": 150,
        "compare_price": 200,
        "stock": 35,
        "description": "Soapnut (Reetha/Sapindus mukorossi) powder made from dried soapnut shells rich in natural saponins. It is a zero-chemical, biodegradable cleansing agent used in hair care, laundry, and household cleaning.",
        "benefits": [
            "Natural saponins provide effective lathering and cleansing without harsh sulfates or chemicals",
            "Gentle on scalp and skin \u2014 ideal for sensitive, dandruff-prone, or chemically treated hair",
            "Biodegradable and eco-friendly, safe for the environment and septic systems",
            "Antifungal properties help control dandruff, scalp itchiness, and lice infestation"
        ],
        "uses": [
            "Used as a natural shampoo by making a liquid solution for hair washing",
            "Used as a natural detergent for delicate fabrics and everyday laundry",
            "Dissolved in water to make a multi-purpose natural cleaning solution for home surfaces",
            "Used in Ayurvedic formulations for skin conditions like eczema and psoriasis"
        ],
        "nutritional_facts": "Not a food product. Saponin content: 12-15%. Natural plant-based surfactant. Free from chemicals, SLS, and parabens.",
        "storage": "Store in an airtight container away from moisture and humidity. Keep in a cool, dry place. Shelf life: 12-18 months.",
        "images": ["/images/products/lifestyle-img5.jpg"],
        "tags": []
    },

    {
        "name": "Emmer Wheat (Jaave Godhi)",
        "slug": "jaave-godhi-wheat",
        "sort_order": 64,
        "collection": "others",
        "price": 80,
        "compare_price": 120,
        "stock": 50,
        "description": "Jaave Godhi, also known as Emmer wheat or Khapli wheat, is an ancient variety of wheat with a hard outer bran layer. It is lower in gluten and higher in nutrients compared to modern refined wheat.",
        "benefits": [
            "Lower gluten content and different gluten structure compared to modern wheat \u2014 easier on digestion",
            "Higher fiber content helps regulate blood sugar and reduces risk of type 2 diabetes",
            "Rich in magnesium, zinc, and iron, nutrients often depleted in modern wheat varieties",
            "Contains resistant starch and antioxidants that support gut and heart health"
        ],
        "uses": [
            "Ground into whole wheat flour (atta) for making rotis, chapatis, and parathas",
            "Cooked as whole grain berry in salads, pilafs, and grain bowls",
            "Used in traditional Karnataka and Maharashtrian preparations like khichdi and porridge",
            "Recommended by nutritionists as a low-GI wheat substitute for diabetics"
        ],
        "nutritional_facts": "Per 100g: Calories 339 kcal, Protein 14.6g, Fat 2.5g, Carbohydrates 63g, Fiber 9.2g, Iron 3.6mg, Magnesium 144mg, Zinc 3.5mg",
        "storage": "Store in an airtight container in a cool, dry place. Keep away from humidity and pests. Whole grain: 6 months; Milled flour: use within 2-3 months.",
        "images": ["/images/products/sesame-seeds-1.png"],
        "tags": ["bestseller"]
    },
    {
        "name": "Emmer Wheat Powder",
        "slug": "emmer-wheat-powder",
        "sort_order": 65,
        "collection": "others",
        "price": 100,
        "compare_price": 140,
        "stock": 40,
        "description": "Stone-ground whole wheat flour made from Emmer wheat (Jaave Godhi / Khapli wheat), retaining the bran and germ. A nutritionally superior alternative to regular refined wheat flour with lower gluten and higher fiber.",
        "benefits": [
            "Lower gluten content and different gluten structure than modern wheat — easier on digestion",
            "Higher fiber supports blood sugar regulation and reduces type 2 diabetes risk",
            "Rich in magnesium, zinc, and iron — nutrients often depleted in refined flour",
            "Contains resistant starch and antioxidants that support gut and heart health"
        ],
        "uses": [
            "Used to make chapatis, rotis, and parathas with a slightly nutty flavor",
            "Used in baking bread, muffins, and traditional wheat-based preparations",
            "Mixed with regular flour for a nutritional upgrade in everyday baking",
            "Prepared as porridge or malt drink for a nutritious breakfast"
        ],
        "nutritional_facts": "Per 100g: Calories 339 kcal, Protein 14.6g, Fat 2.5g, Carbohydrates 63g, Fiber 9.2g, Iron 3.6mg, Magnesium 144mg, Zinc 3.5mg",
        "storage": "Store in an airtight container in a cool, dry place. Use within 2-3 months of milling for best freshness.",
        "images": ["/images/products/sesame-seeds-2.png"],
        "tags": []
    },
    {
        "name": "Moringa Powder",
        "slug": "moringa-powder",
        "sort_order": 66,
        "collection": "others",
        "price": 250,
        "compare_price": 320,
        "stock": 35,
        "description": "Dried and powdered moringa (drumstick tree / Moringa oleifera) leaves, known as the 'miracle tree' for its exceptional nutritional density. Rich in vitamins, minerals, and antioxidants.",
        "benefits": [
            "Contains 7x more vitamin C than oranges, 4x more calcium than milk, and 3x more iron than spinach",
            "Isothiocyanates and flavonoids provide potent anti-inflammatory and antioxidant protection",
            "Supports blood sugar regulation with compounds that mimic insulin action",
            "Rich in plant protein with all essential amino acids — rare for a leaf-based supplement"
        ],
        "uses": [
            "Added to smoothies, juices, and health drinks for a nutritional boost",
            "Mixed into dals, soups, and gravies for added vitamins and minerals",
            "Stirred into warm milk or golden milk for an antioxidant-rich daily supplement",
            "Used in Ayurvedic formulations for detoxification, immunity, and energy enhancement"
        ],
        "nutritional_facts": "Per 100g: Calories 64 kcal, Protein 9.4g, Fat 1.4g, Carbohydrates 8.3g, Fiber 2g, Vitamin C 141mg, Calcium 185mg, Iron 4mg, Potassium 337mg",
        "storage": "Store in an airtight glass jar away from sunlight and moisture. Refrigerate for extended freshness. Shelf life: 6-12 months.",
        "images": ["/images/products/sesame-seeds-3.png"],
        "tags": []
    },
    {
        "name": "Amla Powder",
        "slug": "amla-powder",
        "sort_order": 67,
        "collection": "others",
        "price": 200,
        "compare_price": 260,
        "stock": 40,
        "description": "Dried and powdered Indian gooseberry (amla / Phyllanthus emblica), one of the richest natural sources of Vitamin C and a cornerstone of Ayurvedic medicine for thousands of years.",
        "benefits": [
            "One of the richest natural sources of Vitamin C — 20x more than oranges",
            "Tannins and ellagic acid in amla protect DNA and cells from oxidative damage",
            "Traditionally used to improve hair health, scalp circulation, and prevent premature greying",
            "Supports liver health, aids digestion, and boosts overall immune function"
        ],
        "uses": [
            "Consumed daily (1 tsp) with warm water or honey as an immunity and wellness supplement",
            "Mixed into hair oil preparations for scalp nourishment and hair growth",
            "Added to chutneys, pickles, and traditional amla-based Ayurvedic preparations",
            "Used in triphala formulations and Ayurvedic rasayanas for rejuvenation"
        ],
        "nutritional_facts": "Per 100g: Calories 44 kcal, Carbohydrates 10.2g, Protein 0.9g, Vitamin C 600-900mg, Calcium 50mg, Iron 1.2mg, Tannins 28%, Polyphenols present",
        "storage": "Store in an airtight glass jar in a cool, dark place. Keep away from moisture. Shelf life: 12-18 months.",
        "images": ["/images/products/sesame-seeds-4.png"],
        "tags": []
    },
    {
        "name": "Chia Seeds",
        "slug": "chia-seeds",
        "sort_order": 68,
        "collection": "others",
        "price": 280,
        "compare_price": 360,
        "stock": 30,
        "description": "Organic chia seeds (Salvia hispanica) — tiny black seeds that are one of the most nutrient-dense foods on the planet. Rich in omega-3 fatty acids, fiber, protein, and minerals.",
        "benefits": [
            "Richest plant source of ALA omega-3 fatty acids supporting heart, brain, and inflammation control",
            "Extremely high fiber (34g per 100g) — forms a gel when wet, supporting satiety and digestion",
            "High calcium content — 5x more than milk, supporting bone health for dairy-free individuals",
            "Complete protein with all essential amino acids, rare for a plant-based food"
        ],
        "uses": [
            "Soaked in water or milk overnight to make chia pudding — a nutritious breakfast",
            "Added to smoothies, juices, and health drinks for instant omega-3 and fiber boost",
            "Sprinkled on yogurt, salads, oatmeal, and baked goods",
            "Used as an egg substitute in vegan baking (1 tbsp + 3 tbsp water = 1 egg)"
        ],
        "nutritional_facts": "Per 100g: Calories 486 kcal, Protein 17g, Fat 31g (ALA Omega-3 18g), Carbohydrates 42g, Fiber 34g, Calcium 631mg, Iron 7.7mg, Magnesium 335mg",
        "storage": "Store in an airtight container in a cool, dry place away from sunlight. Shelf life: 2+ years when dry.",
        "images": ["https://images.unsplash.com/photo-1571197119738-26123cb7f36a?w=1200"],
        "tags": []
    },
    {
        "name": "Pumpkin Seeds",
        "slug": "pumpkin-seeds",
        "sort_order": 69,
        "collection": "others",
        "price": 300,
        "compare_price": 380,
        "stock": 25,
        "description": "Raw unroasted pumpkin seeds (pepitas) from organic pumpkins, rich in zinc, magnesium, and plant-based omega-3 fatty acids. A nutritional powerhouse snack and cooking ingredient.",
        "benefits": [
            "Exceptionally high in zinc — one of the best plant-based sources, supporting immunity and testosterone",
            "Rich in magnesium supporting over 300 enzymatic reactions including muscle and nerve function",
            "Contains tryptophan — a precursor to serotonin supporting mood, sleep, and mental health",
            "Antioxidant carotenoids and Vitamin E protect against oxidative stress and cellular aging"
        ],
        "uses": [
            "Eaten raw or roasted as a nutritious high-protein snack",
            "Added to salads, grain bowls, and trail mixes for crunch and nutrition",
            "Blended into smoothies or ground into seed butter as a peanut butter alternative",
            "Sprinkled on soups, yogurt, and breakfast bowls for added minerals"
        ],
        "nutritional_facts": "Per 100g: Calories 559 kcal, Protein 30g, Fat 49g (MUFA 16g, Omega-6 21g), Carbohydrates 10.7g, Fiber 6g, Zinc 7.6mg, Magnesium 592mg, Iron 8.8mg",
        "storage": "Store in an airtight container in a cool, dry place. Refrigerate for extended freshness. Shelf life: 6-12 months.",
        "images": ["/images/products/sesame-seeds-bowl.jpg"],
        "tags": []
    },
    {
        "name": "Sunflower Seeds",
        "slug": "sunflower-seeds",
        "sort_order": 70,
        "collection": "others",
        "price": 180,
        "compare_price": 240,
        "stock": 35,
        "description": "Raw sunflower seeds (Helianthus annuus) — nutritious edible seeds rich in Vitamin E, magnesium, and healthy linoleic acid. A versatile ingredient for snacking, salads, and baking.",
        "benefits": [
            "Exceptionally high in Vitamin E — one of the best plant sources, protecting cells from oxidative damage",
            "High in magnesium supporting bone health, muscle function, and stress reduction",
            "Phytosterols in sunflower seeds help block cholesterol absorption and support heart health",
            "Rich in selenium, a trace mineral with antioxidant and thyroid-supporting properties"
        ],
        "uses": [
            "Eaten raw or roasted as a nutritious snack or trail mix ingredient",
            "Added to bread, muffins, granola, and other baked goods for crunch and nutrition",
            "Sprinkled on salads, grain bowls, and yogurt for added vitamins and texture",
            "Blended into sunflower seed butter as a nut-free spread alternative"
        ],
        "nutritional_facts": "Per 100g: Calories 584 kcal, Protein 20.8g, Fat 51.5g (MUFA 18.5g, PUFA 23g), Carbohydrates 20g, Fiber 8.6g, Vitamin E 35.2mg, Magnesium 325mg",
        "storage": "Store in an airtight container in a cool, dark place. Refrigerate for extended freshness. Shelf life: 6-12 months.",
        "images": ["/images/products/lifestyle-img1.jpg"],
        "tags": []
    },
    {
        "name": "Flax Seeds",
        "slug": "flax-seeds",
        "sort_order": 71,
        "collection": "others",
        "price": 160,
        "compare_price": 220,
        "stock": 40,
        "description": "Whole flax seeds (linseed / Linum usitatissimum) — tiny nutritional powerhouses rich in ALA omega-3 fatty acids, lignans, and soluble fiber. One of the most researched superfoods for heart and hormonal health.",
        "benefits": [
            "Richest plant source of ALA omega-3 fatty acids — reduces inflammation and supports heart health",
            "Lignans in flax are the richest dietary source of phytoestrogens, supporting hormonal balance",
            "Soluble fiber forms a gel in the gut, regulating blood sugar and lowering LDL cholesterol",
            "May reduce risk of certain cancers due to anti-estrogenic and antioxidant lignans"
        ],
        "uses": [
            "Ground and added to smoothies, yogurt, oatmeal, and baked goods",
            "Whole seeds added to bread dough and crackers for crunch and nutrition",
            "Used as an egg substitute in vegan baking (1 tbsp ground flax + 3 tbsp water)",
            "Sprinkled on salads and grain bowls for daily omega-3 supplementation"
        ],
        "nutritional_facts": "Per 100g: Calories 534 kcal, Protein 18.3g, Fat 42.2g (ALA Omega-3 22.8g), Carbohydrates 28.9g, Fiber 27.3g, Calcium 255mg, Iron 5.7mg, Lignans 0.3g",
        "storage": "Store whole seeds in an airtight container in a cool, dry place. Grind just before use as ground flax oxidizes quickly. Shelf life: 1+ year for whole seeds.",
        "images": ["/images/products/lifestyle-img2.jpg"],
        "tags": []
    },
]

# Collections Data
COLLECTIONS = [
    {"name": "Cold Pressed Oils", "slug": "cold-pressed-oils", "description": "Pure, chemical-free oils extracted using traditional wooden press", "image": "/images/products/groundnut-oil-main.webp"},
    {"name": "Traditional Rices", "slug": "traditional-rices", "description": "Heritage rice varieties from across India", "image": "/images/products/rajmudi-rice-main.png"},
    {"name": "Unpolished Millets", "slug": "unpolished-millets", "description": "Nutrient-rich ancient grains for modern health", "image": "/images/products/navane-foxtail-millet-main.png"},
    {"name": "Spices & Pulses", "slug": "spices", "description": "Farm-fresh spices ground to perfection, and whole unpolished pulses", "image": "/images/products/turmeric-powder-main.png"},
    {"name": "Ghee & Honey", "slug": "ghee-honey", "description": "Traditional A2 ghee and raw forest honey", "image": "/images/products/a2-ghee-main.webp"},
    {"name": "Jaggery & Rock Salt", "slug": "jaggery-rocksalt", "description": "Natural sweeteners and mineral-rich salts", "image": "/images/products/organic-jaggery-main.jpeg"},
    {"name": "Chikkis", "slug": "chikkis", "description": "Traditional jaggery-based energy bars", "image": "/images/products/groundnut-chikki-main.png"},
    {"name": "Others", "slug": "others", "description": "Seeds, powders, and other natural wellness products", "image": "/images/products/chia-seeds-main.png"},
]

REMOVED_COLLECTION_SLUGS = {"unpolished-pulses", "shikakai", "wheat", "frontpage"}


def normalize_collection_slug(value: Optional[str]) -> Optional[str]:
    if value in REMOVED_COLLECTION_SLUGS:
        return "others"
    return value

# Blog Posts
BLOG_POSTS = [
    {
        "title": "The Art of Cold Pressing: Why It Matters",
        "slug": "cold-pressing-art",
        "category": "Education",
        "excerpt": "Discover why cold-pressed oils retain more nutrients than refined alternatives.",
        "content": "Cold pressing is an ancient method of extracting oil from seeds and nuts without the use of heat or chemicals. This traditional technique has been used in India for centuries, particularly in South India where wooden oil presses called 'chekku' or 'ghani' have been part of the cultural heritage. Unlike modern refined oils that undergo extensive processing including high-heat extraction, chemical solvents, bleaching, and deodorizing, cold-pressed oils retain their natural color, flavor, and most importantly, their nutritional value. When oils are extracted using heat and chemicals, many of the beneficial compounds are destroyed. Cold pressing preserves natural antioxidants, essential fatty acids, fat-soluble vitamins, and the authentic taste and aroma of the source ingredient.",
        "image": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500",
        "author": "Krishi Team"
    },
    {
        "title": "5 Ways to Use Coconut Oil Beyond Cooking",
        "slug": "coconut-oil-uses",
        "category": "Tips",
        "excerpt": "From hair care to skin moisturizer, coconut oil is nature's multi-tasker.",
        "content": "Coconut oil has been used for centuries across South Asia and Southeast Asia as a multi-purpose wellness product. Its unique composition of medium-chain fatty acids, particularly lauric acid, gives it exceptional properties that extend far beyond the kitchen. Here are five powerful ways to incorporate coconut oil into your daily routine: as a deep hair conditioning treatment, as a natural skin moisturizer, for oil pulling to improve oral health, as a makeup remover, and as a natural remedy for minor skin irritations. The key is to always choose cold-pressed virgin coconut oil for maximum benefit.",
        "image": "https://images.unsplash.com/photo-1526947425960-945c6e72858f?w=500",
        "author": "Krishi Team"
    },
    {
        "title": "Millets: The Ancient Supergrain Making a Comeback",
        "slug": "millets-superfood",
        "category": "Health",
        "excerpt": "Why nutritionists are recommending these forgotten grains.",
        "content": "Millets were staple foods in ancient India for thousands of years before refined grains took over. Today, with rising rates of diabetes, obesity, and digestive disorders, nutritionists are rediscovering what our ancestors knew. Millets like foxtail, little millet, browntop millet, and kodo millet are nutritional powerhouses rich in fiber, iron, magnesium, and plant protein. They have a low glycemic index, making them ideal for diabetics. They are naturally gluten-free, supporting those with digestive sensitivities. And they require significantly less water to grow than rice or wheat, making them environmentally sustainable. Incorporating millets into your diet is one of the simplest changes you can make for both personal and planetary health.",
        "image": "https://images.unsplash.com/photo-1676619357571-b4f086f81299?w=500",
        "author": "Krishi Team"
    },
]

# Serviceable Pincodes
SERVICEABLE_PINCODES = [
    "560001", "560002", "560003", "560004", "560005", "560010", "560011",
    "560020", "560030", "560040", "560050", "560070", "560078", "560100",
    "400001", "400002", "400003", "400050", "400051", "400052",
    "110001", "110002", "110003", "110011", "110012",
    "600001", "600002", "600003", "600010", "600020",
    "500001", "500002", "500003", "500032", "500033",
    "700001", "700002", "700003", "700016", "700017",
    "411001", "411002", "411003", "411014", "411028",
]

FREE_SHIPPING_THRESHOLD = 2000
FREE_SHIPPING_RADIUS_KM = 10
STANDARD_SHIPPING_FEE = 50
OIL_COLLECTION_SLUG = "cold-pressed-oils"


def is_five_litre_size(size_name: Optional[str]) -> bool:
    if not size_name:
        return False
    normalized = str(size_name).lower().replace(" ", "")
    return any(token in normalized for token in ["5l", "5lt", "5ltr", "5liter", "5litre"])


def calculate_oil_offer_discount(items: List[Dict[str, Any]]) -> int:
    discount = 0
    for item in items:
        if item.get("collection") != OIL_COLLECTION_SLUG:
            continue
        if not is_five_litre_size(item.get("size")):
            continue
        discount += int(item.get("quantity", 0)) * 100
    return discount


def is_within_free_shipping_radius(pincode: Optional[str]) -> bool:
    return bool(pincode and pincode in SERVICEABLE_PINCODES)


def _get_sizes(product: dict) -> list:
    slug = product["slug"]
    col = product["collection"]
    price = product["price"]

    # Oils: 250ml, 500ml, 1L, 2L, 3L, 5L
    if col == "cold-pressed-oils":
        return [
            {"name": "250ml", "price_modifier": round(-price * 0.45)},
            {"name": "500ml", "price_modifier": 0},
            {"name": "1L",    "price_modifier": round(price * 0.80)},
            {"name": "2L",    "price_modifier": round(price * 1.70)},
            {"name": "3L",    "price_modifier": round(price * 2.50)},
            {"name": "5L",    "price_modifier": round(price * 4.00)},
        ]
    # Ghee: 500gms
    if col == "ghee-honey" and "ghee" in slug:
        return [
            {"name": "500g", "price_modifier": 0},
        ]
    # Moringa Honey: 200gms only
    if slug == "moringa-honey":
        return [
            {"name": "200g", "price_modifier": 0},
        ]
    # Other honey: 500gms
    if col == "ghee-honey" and "honey" in slug:
        return [
            {"name": "500g", "price_modifier": 0},
        ]
    # Jaggery & Salt: 500gms, 1kg
    if col == "jaggery-rocksalt":
        return [
            {"name": "500g", "price_modifier": 0},
            {"name": "1kg",  "price_modifier": round(price * 0.85)},
        ]
    # Rice: 500gms, 1kg
    if col == "traditional-rices":
        return [
            {"name": "500g", "price_modifier": 0},
            {"name": "1kg",  "price_modifier": round(price * 0.85)},
        ]
    # Millets: 500gms, 1kg
    if col == "unpolished-millets":
        return [
            {"name": "500g", "price_modifier": 0},
            {"name": "1kg",  "price_modifier": round(price * 0.85)},
        ]
    # Spices & Pulses
    if col == "spices":
        # Pulses: 500gms, 1kg
        if any(k in slug for k in ["dal", "gram", "channa", "moong", "urid", "toor", "fried-gram", "green-gram"]):
            return [
                {"name": "500g", "price_modifier": 0},
                {"name": "1kg",  "price_modifier": round(price * 0.85)},
            ]
        # Spice powders: 100gms, 250gms, 500gms, 1kg
        return [
            {"name": "100g",  "price_modifier": 0},
            {"name": "250g",  "price_modifier": round(price * 1.30)},
            {"name": "500g",  "price_modifier": round(price * 2.80)},
            {"name": "1kg",   "price_modifier": round(price * 6.00)},
        ]
    # Sesame chikki: 200gms only
    if slug in ("gingelly-chikki", "sesame-chikki"):
        return [
            {"name": "200g", "price_modifier": 0},
        ]
    # Other chikkis: 250gms, 500gms, 1kg
    if col == "chikkis":
        return [
            {"name": "250g", "price_modifier": 0},
            {"name": "500g", "price_modifier": round(price * 1.60)},
            {"name": "1kg",  "price_modifier": round(price * 3.50)},
        ]
    # Others collection
    if col == "others":
        # Shikakai powder: 200gms
        if "shikakai" in slug or "soapnut" in slug:
            return [
                {"name": "200g", "price_modifier": 0},
            ]
        # Emmer wheat: 500gms, 1kg
        if "wheat" in slug:
            return [
                {"name": "500g", "price_modifier": 0},
                {"name": "1kg",  "price_modifier": round(price * 0.85)},
            ]
        # Powders and seeds: 100gms
        return [
            {"name": "100g", "price_modifier": 0},
        ]
    # Fallback
    return [
        {"name": "500g", "price_modifier": 0},
        {"name": "1kg",  "price_modifier": round(price * 0.85)},
    ]


# Startup and Shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await db.users.create_index("email", unique=True)
        await db.products.create_index("slug", unique=True)
        await db.collections.create_index("slug", unique=True)
        await db.cms_pages.create_index("route", unique=True)
        await db.orders.create_index("user_id")
        await db.subscriptions.create_index("user_id")

        await seed_admin()
        await sync_default_logo()
        await seed_products()
        await sync_seeded_products()
        await sync_curated_product_images()
        await seed_collections()
        await sync_curated_collection_metadata()
        await prune_removed_collections()
        await seed_blog_posts()
        await seed_cms_pages()
        await write_test_credentials()
        logger.info("Database seeded successfully")
    except Exception as e:
        logger.error(f"Startup error (non-fatal): {e}")
    yield
    try:
        client.close()
    except Exception:
        pass


async def seed_admin():
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@krishi.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        hashed = hash_password(admin_password)
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "phone": "",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info(f"Admin user created: {admin_email}")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}}
        )
        logger.info("Admin password updated")

async def ensure_admin_credentials(email: str, password: str):
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@krishi.com").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")

    if email != admin_email or password != admin_password:
        return

    existing = await db.users.find_one({"email": admin_email})
    hashed = hash_password(admin_password)

    if existing is None:
        await db.users.insert_one({
            "email": admin_email,
            "password_hash": hashed,
            "name": "Admin",
            "role": "admin",
            "phone": "",
            "created_at": datetime.now(timezone.utc)
        })
        logger.info("Admin user auto-created during login")
        return

    updates = {}
    if existing.get("role") != "admin":
        updates["role"] = "admin"
    if not verify_password(admin_password, existing["password_hash"]):
        updates["password_hash"] = hashed

    if updates:
        await db.users.update_one({"email": admin_email}, {"$set": updates})
        logger.info("Admin credentials auto-synced during login")

async def sync_default_logo():
    logo_path = Path(__file__).resolve().parent.parent / "frontend" / "public" / "images" / "branding" / "krishi-logo.png"
    if not logo_path.exists():
        logger.warning("Default logo file not found at %s", logo_path)
        return

    mime_type, _ = mimetypes.guess_type(str(logo_path))
    encoded = base64.b64encode(logo_path.read_bytes()).decode("ascii")
    await db.site_images.update_one(
        {"page": "logo", "name": "krishi-logo.png"},
        {
            "$set": {
                "name": "krishi-logo.png",
                "data": encoded,
                "mime_type": mime_type or "image/png",
                "page": "logo",
                "section": "primary",
                "created_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )


async def seed_products():
    from pymongo import UpdateOne
    ops = []
    for product in PRODUCTS_SEED:
        p = build_seed_product(product)
        p.setdefault("created_at", datetime.now(timezone.utc))
        # Do not overwrite admin-edited products on every startup.
        # Seed acts as "create missing only".
        ops.append(UpdateOne({"slug": p["slug"]}, {"$setOnInsert": p}, upsert=True))
    if ops:
        result = await db.products.bulk_write(ops)
        logger.info(f"Products upserted: {result.upserted_count} new, {result.modified_count} updated")


PRODUCT_IMAGE_ASSET_MAP = {
    "groundnut-oil": ["/images/products/groundnut-oil-main.webp"],
    "coconut-oil": ["/images/products/coconut-oil-main.png"],
    "sunflower-oil": ["/images/products/sunflower-oil-main.jpg"],
    "deepam-oil": ["/images/products/deepam-oil-main.png"],
    "castor-oil": ["/images/products/castor-oil-main.png"],
    "gingelly-oil": ["/images/products/gingelly-oil-main.png"],
    "safflower-oil": ["/images/products/safflower-oil-main.png"],
    "neem-oil": ["/images/products/neem-oil-main.png"],
    "hippe-oil": ["/images/products/hippe-oil-main.jpg"],
    "almond-oil": ["/images/products/almond-oil-main.jpeg"],
    "virgin-coconut-oil": ["/images/products/virgin-coconut-oil-main.jpeg"],
    "mustard-oil": ["/images/products/mustard-oil-main.jpeg"],
    "flaxseed-oil": ["/images/products/flaxseed-oil-main.jpeg"],
    "niger-seed-oil": ["/images/products/niger-seed-oil-main.png"],
    "pongomia-oil": ["/images/products/pongomia-oil-main.jpeg"],
    "desi-ghee": ["/images/products/desi-ghee-main.webp"],
    "a2-ghee": ["/images/products/a2-ghee-main.webp"],
    "mountain-honey": ["/images/products/mountain-honey-main.webp"],
    "wildforest-honey": ["/images/products/wildforest-honey-main.webp"],
    "moringa-honey": ["/images/products/moringa-honey-main.jpeg"],
    "bamboo-rice": ["/images/products/bamboo-rice-main.png"],
    "brown-rice": ["/images/products/brown-rice-main.png"],
    "red-rice": ["/images/products/red-rice-main.png"],
    "black-rice": ["/images/products/black-rice-main.png"],
    "jeera-samba-rice": ["/images/products/jeera-samba-rice-main.png"],
    "rajmudi-rice": ["/images/products/rajmudi-rice-main.png"],
    "sanmadhu-rice": ["/images/products/sanmadhu-rice-main.png"],
    "sona-masuri-rice": ["/images/products/sona-masuri-rice-main.png"],
    "saame-little-millet": ["/images/products/saame-little-millet-main.png"],
    "korale-browntop-millet": ["/images/products/korale-browntop-millet-main.png"],
    "navane-foxtail-millet": ["/images/products/navane-foxtail-millet-main.png"],
    "aarka-kodo-millet": ["/images/products/aarka-kodo-millet-main.png"],
    "oodalu-barnyard-millet": ["/images/products/oodalu-barnyard-millet-main.png"],
    "quinoa": ["/images/products/quinoa-main.png"],
    "organic-jaggery": ["/images/products/organic-jaggery-main.jpeg"],
    "jaggery-powder": ["/images/products/jaggery-powder-main.jpg"],
    "palm-jaggery": ["/images/products/palm-jaggery-main.jpeg"],
    "bucket-jaggery": ["/images/products/bucket-jaggery-main.jpeg"],
    "rock-salt-crystal": ["/images/products/rock-salt-crystal-main.jpeg"],
    "rock-salt-powder": ["/images/products/rock-salt-powder-main.webp"],
    "organic-jaggery-round": ["/images/products/organic-jaggery-round-main.jpg"],
    "turmeric-powder": ["/images/products/turmeric-powder-main.png"],
    "chilli-powder": ["/images/products/chilli-powder-main.png"],
    "sambhar-powder": ["/images/products/sambhar-powder-main.png"],
    "coriander-powder": ["/images/products/coriander-powder-main.png"],
    "jeera-powder": ["/images/products/jeera-powder-main.png"],
    "vaangi-bath-powder": ["/images/products/vaangi-bath-powder-main.png"],
    "puliogare-powder": ["/images/products/puliogare-powder-main.png"],
    "bisibelebath-powder": ["/images/products/bisibelebath-powder-main.png"],
    "rasam-powder": ["/images/products/rasam-powder-main.png"],
    "groundnut-chutney-powder": ["/images/products/groundnut-chutney-powder-main.png"],
    "nigerseed-powder": ["/images/products/nigerseed-powder-main.png"],
    "toor-dal": ["/images/products/toor-dal-main.png"],
    "channa-dal": ["/images/products/channa-dal-main.png"],
    "moong-dal": ["/images/products/moong-dal-main.png"],
    "urid-dal": ["/images/products/urid-dal-main.png"],
    "fried-gram": ["/images/products/fried-gram-main.png"],
    "black-urid-dal": ["/images/products/black-urid-dal-main.png"],
    "black-channa-dal": ["/images/products/black-channa-dal-main.png"],
    "green-gram": ["/images/products/green-gram-main.png"],
    "groundnut-chikki": ["/images/products/groundnut-chikki-main.png"],
    "sesame-chikki": ["/images/products/sesame-chikki-main.png"],
    "coco-chikki": ["/images/products/coco-chikki-main.png"],
    "shikakai-powder": ["/images/products/shikakai-powder-main.png"],
    "jaave-godhi-wheat": ["/images/products/jaave-godhi-wheat-main.png"],
    "emmer-wheat-powder": ["/images/products/emmer-wheat-powder-main.png"],
    "moringa-powder": ["/images/products/moringa-powder-main.png"],
    "amla-powder": ["/images/products/amla-powder-main.png"],
    "chia-seeds": ["/images/products/chia-seeds-main.png"],
    "pumpkin-seeds": ["/images/products/pumpkin-seeds-main.png"],
    "sunflower-seeds": ["/images/products/sunflower-seeds-main.png"],
    "flax-seeds": ["/images/products/flax-seeds-main.png"],
}


def build_seed_product(product: dict) -> dict:
    p = dict(product)
    p["collection"] = normalize_collection_slug(p.get("collection"))
    p["sizes"] = _get_sizes(p)
    p["tags"] = p.get("tags", [])
    p["images"] = PRODUCT_IMAGE_ASSET_MAP.get(p["slug"], p.get("images", []))
    return p


def serialize_product_record(product: dict) -> dict:
    p = dict(product)
    p["collection"] = normalize_collection_slug(p.get("collection"))
    return p


def serialize_collection_record(collection: dict) -> dict:
    c = dict(collection)
    c["slug"] = normalize_collection_slug(c.get("slug"))
    return c


async def sync_seeded_products():
    """
    Preserve admin/CMS edits on existing product records while still backfilling
    missing fields for legacy seeded data.
    """
    now = datetime.now(timezone.utc)
    updated = 0
    for product in PRODUCTS_SEED:
        payload = build_seed_product(product)
        existing = await db.products.find_one({"slug": payload["slug"]})
        if not existing:
            continue

        set_updates = {}
        for key, value in payload.items():
            if key in {"name", "description", "collection", "price", "compare_price", "stock", "benefits", "uses", "nutritional_facts", "storage", "tags", "sizes", "images", "sort_order"}:
                if existing.get(key) in (None, "", [], {}):
                    set_updates[key] = value

        if set_updates:
            set_updates["updated_at"] = now
            await db.products.update_one({"slug": payload["slug"]}, {"$set": set_updates})
            updated += 1

    logger.info(f"Seeded product defaults backfilled: {updated}")


async def seed_collections():
    from pymongo import UpdateOne
    ops = [
        # Do not overwrite admin-edited collections on every startup.
        UpdateOne({"slug": col["slug"]}, {"$setOnInsert": col}, upsert=True)
        for col in COLLECTIONS
    ]
    if ops:
        await db.collections.bulk_write(ops)
        logger.info("Collections upserted")


async def sync_curated_collection_metadata():
    """
    Backfill missing collection metadata without overwriting admin-managed CMS edits.
    """
    legacy_image_migrations = {
        "cold-pressed-oils": {
            "from": {"/images/products/groundnut-oil-main.jpeg"},
            "to": "/images/products/groundnut-oil-main.webp",
        }
    }
    updated = 0
    now = datetime.now(timezone.utc)
    for col in COLLECTIONS:
        existing = await db.collections.find_one({"slug": col["slug"]})
        if not existing:
            continue

        set_updates = {}
        for key in ("name", "description", "image"):
            if existing.get(key) in (None, "", []):
                set_updates[key] = col[key]
        migration = legacy_image_migrations.get(col["slug"])
        if migration and existing.get("image") in migration["from"]:
            set_updates["image"] = migration["to"]

        if not set_updates:
            continue

        result = await db.collections.update_one(
            {"slug": col["slug"]},
            {
                "$set": {
                    **set_updates,
                    "updated_at": now,
                }
            },
        )
        if result.matched_count:
            updated += 1
    logger.info(f"Curated collection metadata synced: {updated}/{len(COLLECTIONS)}")

async def prune_removed_collections():
    """
    Remove deprecated collections from DB so backend/frontend collection lists stay aligned.
    Any products still assigned to removed collections are moved to `others`.
    """
    removed = list(REMOVED_COLLECTION_SLUGS)
    await db.collections.delete_many({"slug": {"$in": removed}})
    await db.products.update_many(
        {"collection": {"$in": removed}},
        {"$set": {"collection": "others", "updated_at": datetime.now(timezone.utc)}}
    )


async def ensure_removed_collections_pruned():
    # Defensive cleanup for deployments that may still have stale collection rows/products.
    await prune_removed_collections()


async def seed_blog_posts():
    from pymongo import UpdateOne
    ops = []
    for post in BLOG_POSTS:
        p = dict(post)
        p.setdefault("published", True)
        p.setdefault("created_at", datetime.now(timezone.utc))
        # Do not overwrite admin-edited blog posts on every startup.
        ops.append(UpdateOne({"slug": p["slug"]}, {"$setOnInsert": p}, upsert=True))
    if ops:
        await db.blog_posts.bulk_write(ops)
        logger.info("Blog posts upserted")

async def seed_cms_pages():
    from pymongo import UpdateOne
    now = datetime.now(timezone.utc)
    predefined = [
        ("/", "Home"),
        ("/about", "About"),
        ("/contact", "Contact"),
        ("/bundle", "Bundle Builder"),
        ("/pages/oil", "Oil Education"),
        ("/collections/all", "Collections"),
        ("/products", "Product Detail"),
        ("/cart", "Cart"),
        ("/account", "Account"),
        ("/login", "Login"),
        ("/register", "Register"),
    ]
    ops = []
    for route, name in predefined:
        doc = {
            "route": route,
            "name": name,
            "status": "draft",
            "content_html": "",
            "sections": {},
            "created_at": now,
            "updated_at": now,
        }
        ops.append(UpdateOne({"route": route}, {"$setOnInsert": doc}, upsert=True))
    if ops:
        await db.cms_pages.bulk_write(ops)
        logger.info("CMS pages seeded")

async def sync_curated_product_images():
    """
    Migrate deprecated curated image paths without overwriting admin-managed
    product image changes.
    """
    migrations = {
        "groundnut-oil": {
            "from": {"/images/products/groundnut-oil-main.jpeg"},
            "to": ["/images/products/groundnut-oil-main.webp"],
        }
    }

    updated = 0
    now = datetime.now(timezone.utc)
    for slug, config in migrations.items():
        product = await db.products.find_one({"slug": slug})
        if not product:
            continue

        current_images = product.get("images") or []
        if not current_images or set(current_images).issubset(config["from"]):
            await db.products.update_one(
                {"slug": slug},
                {"$set": {"images": config["to"], "updated_at": now}},
            )
            updated += 1

    logger.info(f"Curated image migrations applied: {updated}")


async def write_test_credentials():
    # Skip file write in serverless / read-only environments
    try:
        creds_path = Path("/tmp/test_credentials.md")
        creds_path.write_text(
            "# Test Credentials\n\n"
            "## Admin Account\n"
            "- Email: admin@krishi.com\n"
            "- Password: admin123\n"
            "- Role: admin\n\n"
            "## Test User Account\n"
            "- Email: test@example.com\n"
            "- Password: test123\n"
            "- Role: user\n\n"
            "## Auth Endpoints\n"
            "- POST /api/auth/register\n"
            "- POST /api/auth/login\n"
            "- POST /api/auth/logout\n"
            "- GET /api/auth/me\n"
        )
    except Exception:
        pass  # Ignore in read-only environments


app = FastAPI(lifespan=lifespan)

FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
_cors_origins = [o.strip() for o in FRONTEND_URL.split(",") if o.strip()]
_cors_origins += ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=_cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")

# ── Auth Routes ─────────────────────────────────────────────────────────────

@api_router.post("/auth/register")
async def register(data: UserRegister, response: Response):
    email = data.email.lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_doc = {
        "email": email,
        "password_hash": hash_password(data.password),
        "name": data.name,
        "phone": data.phone or "",
        "role": "user",
        "created_at": datetime.now(timezone.utc)
    }
    result = await db.users.insert_one(user_doc)
    user_id = str(result.inserted_id)

    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)

    response.set_cookie(key="access_token", value=access_token, httponly=False, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=False, secure=False, samesite="lax", max_age=604800, path="/")

    return {"id": user_id, "name": data.name, "email": email, "role": "user", "access_token": access_token}


@api_router.post("/auth/login")
async def login(data: UserLogin, response: Response):
    email = data.email.lower()
    await ensure_admin_credentials(email, data.password)
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    user_id = str(user["_id"])
    access_token = create_access_token(user_id, email)
    refresh_token = create_refresh_token(user_id)

    response.set_cookie(key="access_token", value=access_token, httponly=False, secure=False, samesite="lax", max_age=3600, path="/")
    response.set_cookie(key="refresh_token", value=refresh_token, httponly=False, secure=False, samesite="lax", max_age=604800, path="/")

    return {"id": user_id, "name": user["name"], "email": user["email"], "role": user.get("role", "user"), "access_token": access_token}


@api_router.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out successfully"}


@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return user


# ── Product Routes ──────────────────────────────────────────────────────────

@api_router.get("/products")
async def get_products(
    collection: Optional[str] = None,
    search: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    sort: Optional[str] = "default",
    limit: int = 50
):
    query: Dict[str, Any] = {}
    if collection:
        # Backward compatibility for legacy admin slugs previously saved from CMS.
        legacy_aliases = {
            "unpolished-millets": ["millets"],
            "jaggery-rocksalt": ["jaggery-rock-salt"],
            "chikkis": ["snacks"],
            "shikakai": ["natural-care"],
            "wheat": ["cereals"],
        }
        accepted = [collection] + legacy_aliases.get(collection, [])
        query["collection"] = {"$in": accepted}
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}}
        ]
    if min_price is not None:
        query["price"] = {"$gte": min_price}
    if max_price is not None:
        query.setdefault("price", {})["$lte"] = max_price

    if sort == "price_desc":
        sort_field, sort_dir = "price", -1
    elif sort == "price_asc":
        sort_field, sort_dir = "price", 1
    elif sort == "name":
        sort_field, sort_dir = "name", 1
    else:
        sort_field, sort_dir = "sort_order", 1

    products = await db.products.find(query, {"_id": 0}).sort(sort_field, sort_dir).limit(limit).to_list(limit)
    return [serialize_product_record(product) for product in products]


@api_router.get("/products/{slug}")
async def get_product(slug: str):
    product = await db.products.find_one({"slug": slug}, {"_id": 0})
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return serialize_product_record(product)


@api_router.get("/products/{slug}/related")
async def get_related_products(slug: str):
    product = await db.products.find_one({"slug": slug})
    if not product:
        return []

    related = await db.products.find(
        {"collection": product["collection"], "slug": {"$ne": slug}},
        {"_id": 0}
    ).sort("sort_order", 1).limit(4).to_list(4)
    return [serialize_product_record(item) for item in related]


# ── Collection Routes ───────────────────────────────────────────────────────

@api_router.get("/collections")
async def get_collections():
    await ensure_removed_collections_pruned()
    collections = await db.collections.find(
        {"slug": {"$nin": list(REMOVED_COLLECTION_SLUGS)}},
        {"_id": 0},
    ).to_list(100)
    return [serialize_collection_record(collection) for collection in collections]


@api_router.get("/collections/{slug}")
async def get_collection(slug: str):
    collection = await db.collections.find_one({"slug": slug}, {"_id": 0})
    if not collection:
        raise HTTPException(status_code=404, detail="Collection not found")
    return serialize_collection_record(collection)


# ── Cart Routes ─────────────────────────────────────────────────────────────

@api_router.get("/cart")
async def get_cart(request: Request, user: Optional[dict] = Depends(get_optional_user)):
    if user:
        cart = await db.carts.find_one({"user_id": user["_id"]}, {"_id": 0})
        return cart or {"items": [], "subtotal": 0, "discount": 0, "total": 0}
    return {"items": [], "subtotal": 0, "discount": 0, "total": 0}


@api_router.post("/cart")
async def update_cart(data: CartUpdate, request: Request, user: Optional[dict] = Depends(get_optional_user)):
    items = []
    total = 0

    product_slugs = [item.product_id for item in data.items]
    products_list = await db.products.find({"slug": {"$in": product_slugs}}).to_list(len(product_slugs))
    products_map = {p["slug"]: p for p in products_list}

    for item in data.items:
        product = products_map.get(item.product_id)
        if product:
            price = product["price"]
            if item.size:
                for size in product.get("sizes", []):
                    if size["name"] == item.size:
                        price += size.get("price_modifier", 0)

            items.append({
                "product_id": item.product_id,
                "name": product["name"],
                "price": round(price),
                "quantity": item.quantity,
                "size": item.size,
                "collection": product["collection"],
                "image": product["images"][0] if product.get("images") else ""
            })
            total += round(price) * item.quantity

    discount = calculate_oil_offer_discount(items)

    cart_data = {
        "items": items,
        "subtotal": total,
        "discount": discount,
        "total": total - discount,
        "updated_at": datetime.now(timezone.utc)
    }

    if user:
        cart_data["user_id"] = user["_id"]
        await db.carts.update_one({"user_id": user["_id"]}, {"$set": cart_data}, upsert=True)

    return cart_data


@api_router.post("/cart/add")
async def add_to_cart(item: CartItem, request: Request, user: Optional[dict] = Depends(get_optional_user)):
    if not user:
        raise HTTPException(status_code=401, detail="Please login to add items to cart")

    cart = await db.carts.find_one({"user_id": user["_id"]})
    items = cart.get("items", []) if cart else []

    found = False
    for existing in items:
        if existing["product_id"] == item.product_id and existing.get("size") == item.size:
            existing["quantity"] += item.quantity
            found = True
            break

    if not found:
        product = await db.products.find_one({"slug": item.product_id})
        if product:
            price = product["price"]
            if item.size:
                for size in product.get("sizes", []):
                    if size["name"] == item.size:
                        price += size.get("price_modifier", 0)

            items.append({
                "product_id": item.product_id,
                "name": product["name"],
                "price": round(price),
                "quantity": item.quantity,
                "size": item.size,
                "collection": product["collection"],
                "image": product["images"][0] if product.get("images") else ""
            })

    total = sum(i["price"] * i["quantity"] for i in items)
    discount = calculate_oil_offer_discount(items)

    cart_data = {
        "user_id": user["_id"],
        "items": items,
        "subtotal": total,
        "discount": discount,
        "total": total - discount,
        "updated_at": datetime.now(timezone.utc)
    }

    await db.carts.update_one({"user_id": user["_id"]}, {"$set": cart_data}, upsert=True)
    return cart_data


# ── Order Routes ────────────────────────────────────────────────────────────

@api_router.post("/orders")
async def create_order(data: OrderCreate, user: dict = Depends(get_current_user)):
    items = []
    total = 0

    product_slugs = [item.product_id for item in data.items]
    products_list = await db.products.find({"slug": {"$in": product_slugs}}).to_list(len(product_slugs))
    products_map = {p["slug"]: p for p in products_list}

    from pymongo import UpdateOne
    stock_updates = []

    for item in data.items:
        product = products_map.get(item.product_id)
        if product:
            price = product["price"]
            if item.size:
                for size in product.get("sizes", []):
                    if size["name"] == item.size:
                        price += size.get("price_modifier", 0)

            items.append({
                "product_id": item.product_id,
                "name": product["name"],
                "price": round(price),
                "quantity": item.quantity,
                "size": item.size,
                "collection": product["collection"],
                "image": product["images"][0] if product.get("images") else ""
            })
            total += round(price) * item.quantity
            stock_updates.append(UpdateOne({"slug": item.product_id}, {"$inc": {"stock": -item.quantity}}))

    if stock_updates:
        await db.products.bulk_write(stock_updates)

    discount = calculate_oil_offer_discount(items)
    within_radius = is_within_free_shipping_radius(data.shipping_address.get("pincode"))
    shipping = 0 if total >= FREE_SHIPPING_THRESHOLD and within_radius else STANDARD_SHIPPING_FEE

    payment_method = data.payment_method or "COD"
    payment_status = "placeholder_pending" if payment_method == "Razorpay Placeholder" else "pending"

    order_doc = {
        "user_id": user["_id"],
        "items": items,
        "subtotal": total,
        "discount": discount,
        "shipping": shipping,
        "total": total - discount + shipping,
        "shipping_address": data.shipping_address,
        "payment_method": payment_method,
        "payment_status": payment_status,
        "payment_provider": "razorpay" if payment_method == "Razorpay Placeholder" else "offline",
        "status": "pending",
        "created_at": datetime.now(timezone.utc),
        "free_shipping_applied": shipping == 0,
        "within_10km_radius": within_radius,
    }

    result = await db.orders.insert_one(order_doc)
    order_id = str(result.inserted_id)

    await db.carts.delete_one({"user_id": user["_id"]})
    return {
        "order_id": order_id,
        "status": "pending",
        "total": order_doc["total"],
        "payment_method": order_doc["payment_method"],
        "payment_status": order_doc["payment_status"],
    }


@api_router.get("/orders")
async def get_orders(user: dict = Depends(get_current_user)):
    orders = await db.orders.find({"user_id": user["_id"]}).sort("created_at", -1).to_list(100)
    result = []
    for order in orders:
        order["order_id"] = str(order["_id"])
        del order["_id"]
        if "created_at" in order and hasattr(order["created_at"], "isoformat"):
            order["created_at"] = order["created_at"].isoformat()
        result.append(order)
    return result


@api_router.get("/orders/{order_id}")
async def get_order(order_id: str, user: dict = Depends(get_current_user)):
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id), "user_id": user["_id"]}, {"_id": 0})
    except Exception:
        raise HTTPException(status_code=404, detail="Order not found")

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    if "created_at" in order and hasattr(order["created_at"], "isoformat"):
        order["created_at"] = order["created_at"].isoformat()

    return order


# ── Subscription Routes ─────────────────────────────────────────────────────

@api_router.get("/subscriptions")
async def get_subscriptions(user: dict = Depends(get_current_user)):
    subs = await db.subscriptions.find({"user_id": user["_id"]}).to_list(100)
    result = []
    for sub in subs:
        sub["id"] = str(sub["_id"])
        del sub["_id"]
        if "next_delivery_date" in sub and hasattr(sub["next_delivery_date"], "isoformat"):
            sub["next_delivery_date"] = sub["next_delivery_date"].isoformat()
        if "created_at" in sub and hasattr(sub["created_at"], "isoformat"):
            sub["created_at"] = sub["created_at"].isoformat()
        result.append(sub)
    return result


@api_router.patch("/subscriptions/{subscription_id}")
async def update_subscription(subscription_id: str, data: SubscriptionUpdate, user: dict = Depends(get_current_user)):
    try:
        subscription = await db.subscriptions.find_one({"_id": ObjectId(subscription_id), "user_id": user["_id"]})
    except Exception:
        raise HTTPException(status_code=404, detail="Subscription not found")

    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")

    update_data: Dict[str, Any] = {}
    if data.action == "pause":
        update_data["status"] = "paused"
    elif data.action == "resume":
        update_data["status"] = "active"
    elif data.action == "skip":
        current_next = subscription.get("next_delivery_date", datetime.now(timezone.utc))
        delta = timedelta(days=30) if subscription.get("frequency") == "monthly" else timedelta(days=60)
        update_data["next_delivery_date"] = current_next + delta
    elif data.action == "cancel":
        update_data["status"] = "cancelled"

    await db.subscriptions.update_one({"_id": ObjectId(subscription_id)}, {"$set": update_data})
    return {"message": f"Subscription {data.action}d successfully"}


# ── Blog Routes ─────────────────────────────────────────────────────────────

@api_router.get("/blog")
async def get_blog_posts(category: Optional[str] = None):
    query: Dict[str, Any] = {"$or": [{"published": True}, {"status": "published"}]}
    if category:
        query["category"] = category
    posts = await db.blog_posts.find(query).sort("created_at", -1).to_list(100)
    return [serialize_post(p) for p in posts]


@api_router.get("/blog/{slug}")
async def get_blog_post(slug: str):
    post = await db.blog_posts.find_one({"slug": slug, "$or": [{"published": True}, {"status": "published"}]})
    if not post:
        raise HTTPException(status_code=404, detail="Blog post not found")
    return serialize_post(post)


# ── CMS Pages (public) ───────────────────────────────────────────────────────

def normalize_route(route: str) -> str:
    if not route:
        return "/"
    cleaned = route.strip()
    if not cleaned.startswith("/"):
        cleaned = "/" + cleaned
    if cleaned != "/" and cleaned.endswith("/"):
        cleaned = cleaned[:-1]
    return cleaned

def cms_route_candidates(route: str) -> list[str]:
    """
    Return CMS lookup candidates from most specific to most generic.
    This keeps exact-route behavior while supporting dynamic detail routes
    (e.g. /products/mustard-oil -> /products or /products/:slug).
    """
    normalized = normalize_route(route)
    candidates: list[str] = [normalized]

    # Keep fallback narrow to product detail routes only.
    # This avoids accidental cross-page matches for unrelated nested routes.
    parts = [p for p in normalized.split("/") if p]
    if len(parts) > 1:
        # For /a/b/c -> /a/b/:slug, /a/b/{slug}, /a/b/[slug], /a/b, /a/:slug, /a
        for depth in range(len(parts) - 1, 0, -1):
            prefix = "/" + "/".join(parts[:depth])
            candidates.extend([
                f"{prefix}/:slug",
                f"{prefix}/{{slug}}",
                f"{prefix}/[slug]",
                prefix,
            ])
    if normalized.startswith("/products/"):
        candidates.extend(["/products/:slug", "/products/{slug}", "/products/[slug]", "/products"])

    # Preserve order, remove duplicates
    seen = set()
    ordered = []
    for item in candidates:
        if item in seen:
            continue
        seen.add(item)
        ordered.append(item)
    return ordered

def serialize_cms_page(page: dict) -> dict:
    page = dict(page)
    if "_id" in page:
        page["id"] = str(page["_id"])
        del page["_id"]
    for f in ["created_at", "updated_at", "published_at"]:
        if f in page and hasattr(page[f], "isoformat"):
            page[f] = page[f].isoformat()
    return page

@api_router.get("/pages/content")
async def get_page_content(route: str):
    normalized = normalize_route(route)
    route_candidates = cms_route_candidates(normalized)
    page = None
    for candidate in route_candidates:
        page = await db.cms_pages.find_one({"route": candidate, "status": "published"})
        if page:
            break
    if not page:
        return {
            "route": normalized,
            "status": "draft",
            "name": normalized,
            "content_html": "",
            "sections": {},
        }
    return serialize_cms_page(page)


# ── Admin Routes ────────────────────────────────────────────────────────────

async def get_admin_user(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

def serialize_post(post: dict) -> dict:
    post = dict(post)
    if "_id" in post:
        post["id"] = str(post["_id"])
        del post["_id"]
    for f in ["created_at", "updated_at", "published_at"]:
        if f in post and hasattr(post[f], "isoformat"):
            post[f] = post[f].isoformat()
    return post

@api_router.get("/admin/pages")
async def admin_list_pages(admin: dict = Depends(get_admin_user)):
    pages = await db.cms_pages.find({}).sort("route", 1).to_list(500)
    return [serialize_cms_page(p) for p in pages]

@api_router.get("/admin/pages/by-route")
async def admin_get_page_by_route(route: str, admin: dict = Depends(get_admin_user)):
    normalized = normalize_route(route)
    page = await db.cms_pages.find_one({"route": normalized})
    if not page:
        return {
            "route": normalized,
            "status": "draft",
            "name": normalized,
            "content_html": "",
            "sections": {},
        }
    return serialize_cms_page(page)

@api_router.post("/admin/pages")
async def admin_create_or_upsert_page(data: CMSPageUpsert, admin: dict = Depends(get_admin_user)):
    now = datetime.now(timezone.utc)
    route = normalize_route(data.route)
    doc = data.model_dump()
    doc["route"] = route
    doc["updated_at"] = now
    if doc.get("status") == "published":
        doc["published_at"] = now
    existing = await db.cms_pages.find_one({"route": route})
    if existing:
        await db.cms_pages.update_one({"_id": existing["_id"]}, {"$set": doc})
        page = await db.cms_pages.find_one({"_id": existing["_id"]})
        return serialize_cms_page(page)
    doc["created_at"] = now
    result = await db.cms_pages.insert_one(doc)
    page = await db.cms_pages.find_one({"_id": result.inserted_id})
    return serialize_cms_page(page)

@api_router.put("/admin/pages/{page_id}")
async def admin_update_page(page_id: str, data: CMSPageUpdate, admin: dict = Depends(get_admin_user)):
    now = datetime.now(timezone.utc)
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    if "route" in update:
        update["route"] = normalize_route(update["route"])
    update["updated_at"] = now
    if update.get("status") == "published":
        update["published_at"] = now
    result = await db.cms_pages.update_one({"_id": ObjectId(page_id)}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Page not found")
    page = await db.cms_pages.find_one({"_id": ObjectId(page_id)})
    return serialize_cms_page(page)

@api_router.get("/admin/stats")
async def get_admin_stats(admin: dict = Depends(get_admin_user)):
    products_count = await db.products.count_documents({})
    published_count = await db.blog_posts.count_documents({"status": "published"})
    draft_count = await db.blog_posts.count_documents({"status": "draft"})
    orders_count = await db.orders.count_documents({})
    users_count = await db.users.count_documents({"role": "user"})
    contacts_count = await db.contacts.count_documents({"status": "new"})
    return {
        "products": products_count,
        "blog_published": published_count,
        "blog_drafts": draft_count,
        "orders": orders_count,
        "users": users_count,
        "new_contacts": contacts_count,
    }

@api_router.get("/admin/blog")
async def admin_list_blog(admin: dict = Depends(get_admin_user)):
    posts = await db.blog_posts.find({}).sort("created_at", -1).to_list(200)
    return [serialize_post(p) for p in posts]

@api_router.post("/admin/blog")
async def admin_create_blog(data: BlogPost, admin: dict = Depends(get_admin_user)):
    existing = await db.blog_posts.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    now = datetime.now(timezone.utc)
    doc = data.model_dump()
    doc["published"] = doc["status"] == "published"
    doc["created_at"] = now
    doc["updated_at"] = now
    if doc["status"] == "published":
        doc["published_at"] = now
    result = await db.blog_posts.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    doc["created_at"] = now.isoformat()
    doc["updated_at"] = now.isoformat()
    return doc

@api_router.put("/admin/blog/{slug}")
async def admin_update_blog(slug: str, data: BlogPostUpdate, admin: dict = Depends(get_admin_user)):
    existing = await db.blog_posts.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Post not found")
    update = {k: v for k, v in data.model_dump().items() if v is not None}
    update["updated_at"] = datetime.now(timezone.utc)
    if update.get("status") == "published" and not existing.get("published_at"):
        update["published_at"] = update["updated_at"]
    if "status" in update:
        update["published"] = update["status"] == "published"
    await db.blog_posts.update_one({"slug": slug}, {"$set": update})
    post = await db.blog_posts.find_one({"slug": slug})
    return serialize_post(post)

@api_router.delete("/admin/blog/{slug}")
async def admin_delete_blog(slug: str, admin: dict = Depends(get_admin_user)):
    result = await db.blog_posts.delete_one({"slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    return {"message": "Post deleted"}

@api_router.get("/admin/blog/{slug}")
async def admin_get_blog(slug: str, admin: dict = Depends(get_admin_user)):
    post = await db.blog_posts.find_one({"slug": slug})
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    return serialize_post(post)

@api_router.get("/admin/contacts")
async def admin_list_contacts(admin: dict = Depends(get_admin_user)):
    contacts = await db.contacts.find({}).sort("created_at", -1).to_list(200)
    return [serialize_post(c) for c in contacts]

@api_router.put("/admin/contacts/{contact_id}")
async def admin_update_contact(contact_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    try:
        from bson import ObjectId as ObjId
        result = await db.contacts.update_one({"_id": ObjId(contact_id)}, {"$set": data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Contact not found")
        return {"message": "Updated"}
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ID")

# ── Admin Product Routes ──────────────────────────────────────────────────────

@api_router.get("/admin/products")
async def admin_list_products(admin: dict = Depends(get_admin_user)):
    await ensure_removed_collections_pruned()
    products = await db.products.find({}).sort("sort_order", 1).to_list(500)
    result = []
    for p in products:
        p["collection"] = normalize_collection_slug(p.get("collection"))
        p["id"] = str(p["_id"])
        del p["_id"]
        result.append(p)
    return result

@api_router.get("/admin/products/{slug}")
async def admin_get_product(slug: str, admin: dict = Depends(get_admin_user)):
    p = await db.products.find_one({"slug": slug})
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    p["collection"] = normalize_collection_slug(p.get("collection"))
    p["id"] = str(p["_id"])
    del p["_id"]
    return p

@api_router.post("/admin/products")
async def admin_create_product(data: ProductCreate, admin: dict = Depends(get_admin_user)):
    existing = await db.products.find_one({"slug": data.slug})
    if existing:
        raise HTTPException(status_code=400, detail="Slug already exists")
    doc = data.model_dump()
    if "storage_info" in doc and "storage" not in doc:
        doc["storage"] = doc.pop("storage_info")
    doc["collection"] = normalize_collection_slug(doc.get("collection"))
    doc["created_at"] = datetime.now(timezone.utc)
    doc["updated_at"] = datetime.now(timezone.utc)
    result = await db.products.insert_one(doc)
    doc["id"] = str(result.inserted_id)
    if "_id" in doc:
        del doc["_id"]
    return doc

@api_router.put("/admin/products/{slug}")
async def admin_update_product(slug: str, data: dict, admin: dict = Depends(get_admin_user)):
    existing = await db.products.find_one({"slug": slug})
    if not existing:
        raise HTTPException(status_code=404, detail="Product not found")
    if "storage_info" in data and "storage" not in data:
        data["storage"] = data.pop("storage_info")
    if "collection" in data:
        data["collection"] = normalize_collection_slug(data.get("collection"))
    data["updated_at"] = datetime.now(timezone.utc)
    await db.products.update_one({"slug": slug}, {"$set": data})
    p = await db.products.find_one({"slug": slug})
    p["id"] = str(p["_id"])
    del p["_id"]
    return p

@api_router.delete("/admin/products/{slug}")
async def admin_delete_product(slug: str, admin: dict = Depends(get_admin_user)):
    result = await db.products.delete_one({"slug": slug})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

# ── Admin Order Routes ────────────────────────────────────────────────────────

@api_router.get("/admin/orders")
async def admin_list_orders(admin: dict = Depends(get_admin_user), status: str = None, limit: int = 100, skip: int = 0):
    query = {}
    if status:
        query["status"] = status
    orders = await db.orders.find(query).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    result = []
    for o in orders:
        o["order_id"] = str(o["_id"])
        del o["_id"]
        if "user_id" in o:
            o["user_id"] = str(o["user_id"])
        if "created_at" in o and hasattr(o["created_at"], "isoformat"):
            o["created_at"] = o["created_at"].isoformat()
        # Lookup user info
        result.append(o)
    return result

@api_router.get("/admin/orders/{order_id}")
async def admin_get_order(order_id: str, admin: dict = Depends(get_admin_user)):
    try:
        from bson import ObjectId as ObjId
        o = await db.orders.find_one({"_id": ObjId(order_id)})
        if not o:
            raise HTTPException(status_code=404, detail="Order not found")
        o["order_id"] = str(o["_id"])
        del o["_id"]
        if "user_id" in o:
            uid = o["user_id"]
            user = await db.users.find_one({"_id": uid})
            if user:
                o["customer"] = {"name": user.get("name"), "email": user.get("email"), "phone": user.get("phone")}
            o["user_id"] = str(uid)
        if "created_at" in o and hasattr(o["created_at"], "isoformat"):
            o["created_at"] = o["created_at"].isoformat()
        return o
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@api_router.put("/admin/orders/{order_id}")
async def admin_update_order(order_id: str, data: dict, admin: dict = Depends(get_admin_user)):
    try:
        from bson import ObjectId as ObjId
        result = await db.orders.update_one({"_id": ObjId(order_id)}, {"$set": data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Order not found")
        return {"message": "Updated"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── Admin Customer Routes ─────────────────────────────────────────────────────

@api_router.get("/admin/customers")
async def admin_list_customers(admin: dict = Depends(get_admin_user), limit: int = 100, skip: int = 0):
    users = await db.users.find({"role": "user"}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)
    result = []
    for u in users:
        uid = u["_id"]
        order_count = await db.orders.count_documents({"user_id": uid})
        total_spent_agg = await db.orders.aggregate([
            {"$match": {"user_id": uid, "status": {"$ne": "cancelled"}}},
            {"$group": {"_id": None, "total": {"$sum": "$total"}}}
        ]).to_list(1)
        total_spent = total_spent_agg[0]["total"] if total_spent_agg else 0
        last_order = await db.orders.find_one({"user_id": uid}, sort=[("created_at", -1)])
        result.append({
            "id": str(uid),
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "phone": u.get("phone", ""),
            "created_at": u["created_at"].isoformat() if "created_at" in u and hasattr(u["created_at"], "isoformat") else None,
            "order_count": order_count,
            "total_spent": total_spent,
            "last_order_date": last_order["created_at"].isoformat() if last_order and hasattr(last_order.get("created_at"), "isoformat") else None,
        })
    return result

@api_router.get("/admin/customers/{customer_id}")
async def admin_get_customer(customer_id: str, admin: dict = Depends(get_admin_user)):
    try:
        from bson import ObjectId as ObjId
        u = await db.users.find_one({"_id": ObjId(customer_id)})
        if not u:
            raise HTTPException(status_code=404, detail="Customer not found")
        uid = u["_id"]
        orders = await db.orders.find({"user_id": uid}).sort("created_at", -1).to_list(50)
        for o in orders:
            o["order_id"] = str(o["_id"])
            del o["_id"]
            if "created_at" in o and hasattr(o["created_at"], "isoformat"):
                o["created_at"] = o["created_at"].isoformat()
            o["user_id"] = str(o.get("user_id", ""))
        return {
            "id": str(uid),
            "name": u.get("name", ""),
            "email": u.get("email", ""),
            "phone": u.get("phone", ""),
            "created_at": u["created_at"].isoformat() if "created_at" in u and hasattr(u["created_at"], "isoformat") else None,
            "orders": orders,
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# ── Contact Routes ──────────────────────────────────────────────────────────

@api_router.post("/contact")
async def submit_contact(data: ContactForm):
    await db.contacts.insert_one({
        "name": data.name,
        "email": data.email,
        "phone": data.phone,
        "message": data.message,
        "created_at": datetime.now(timezone.utc),
        "status": "new"
    })
    return {"message": "Thank you for your message. We will get back to you soon!"}


# ── Pincode Check ───────────────────────────────────────────────────────────

@api_router.post("/check-pincode")
async def check_pincode(data: PincodeCheck):
    is_serviceable = data.pincode in SERVICEABLE_PINCODES
    within_10km = is_within_free_shipping_radius(data.pincode)
    delivery_days = 3 if is_serviceable else 0
    return {
        "pincode": data.pincode,
        "serviceable": is_serviceable,
        "within_10km": within_10km,
        "free_shipping_eligible": within_10km,
        "delivery_days": delivery_days,
        "message": (
            f"Delivery available in {delivery_days} days. Free shipping on orders above ₹{FREE_SHIPPING_THRESHOLD} within {FREE_SHIPPING_RADIUS_KM} km."
            if is_serviceable and within_10km
            else f"Delivery available in {delivery_days} days"
            if is_serviceable
            else "Sorry, we don't deliver to this pincode yet"
        )
    }


# ── Bestsellers ─────────────────────────────────────────────────────────────

@api_router.get("/bestsellers")
async def get_bestsellers():
    products = await db.products.find({"tags": "bestseller"}, {"_id": 0}).sort("sort_order", 1).limit(8).to_list(8)
    return [serialize_product_record(product) for product in products]


# ── Bundle ──────────────────────────────────────────────────────────────────

@api_router.post("/bundle/calculate")
async def calculate_bundle(items: List[str]):
    total = 0
    bundle_items = []
    for slug in items:
        product = await db.products.find_one({"slug": slug}, {"_id": 0})
        if product:
            bundle_items.append(product)
            total += product["price"]
    discount = 0
    return {"items": bundle_items, "subtotal": total, "discount": discount, "total": total - discount}


# ── Health Check ────────────────────────────────────────────────────────────

@api_router.get("/health")
async def health_check():
    try:
        await db.command("ping")
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"
    return {"status": "healthy", "db": db_status, "timestamp": datetime.now(timezone.utc).isoformat()}

# ── One-time Seed Endpoint ───────────────────────────────────────────────────

@api_router.post("/seed")
async def run_seed(token: str):
    """One-time seed endpoint. Protected by SEED_TOKEN env var."""
    expected = os.environ.get("SEED_TOKEN")
    if not expected:
        raise HTTPException(status_code=503, detail="Seed endpoint is not configured")
    if token != expected:
        raise HTTPException(status_code=403, detail="Invalid seed token")
    try:
        await db.users.create_index("email", unique=True)
        await db.products.create_index("slug", unique=True)
        await db.collections.create_index("slug", unique=True)
        await db.cms_pages.create_index("route", unique=True)
        await db.orders.create_index("user_id")
        await db.subscriptions.create_index("user_id")
        await seed_admin()
        await sync_default_logo()
        await seed_products()
        await sync_seeded_products()
        await sync_curated_product_images()
        await seed_collections()
        await sync_curated_collection_metadata()
        await prune_removed_collections()
        await seed_blog_posts()
        await seed_cms_pages()
        return {"status": "seeded", "timestamp": datetime.now(timezone.utc).isoformat()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Media / Images & Videos ──────────────────────────────────────────────────

class ImageUpload(BaseModel):
    name: str
    data: str          # base64 string (with or without data URI prefix)
    mime_type: str
    page: str = "hero"
    section: Optional[str] = None

@api_router.post("/admin/images")
async def upload_image(payload: ImageUpload, admin: dict = Depends(get_admin_user)):
    # Strip data URI prefix if present
    raw = payload.data
    if "," in raw:
        raw = raw.split(",", 1)[1]
    doc = {
        "name": payload.name,
        "data": raw,
        "mime_type": payload.mime_type,
        "page": payload.page,
        "section": payload.section,
        "created_at": datetime.now(timezone.utc),
    }
    result = await db.site_images.insert_one(doc)
    return {"id": str(result.inserted_id), "name": payload.name, "page": payload.page, "section": payload.section}

@api_router.get("/admin/images")
async def list_images(admin: dict = Depends(get_admin_user)):
    images = await db.site_images.find({}, {"data": 0}).sort("created_at", -1).to_list(500)
    return [{
        "id": str(img["_id"]),
        "name": img["name"],
        "mime_type": img["mime_type"],
        "page": img["page"],
        "section": img.get("section"),
        "created_at": img["created_at"].isoformat(),
    } for img in images]

@api_router.delete("/admin/images/{image_id}")
async def delete_image(image_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.site_images.delete_one({"_id": ObjectId(image_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Image not found")
    return {"deleted": image_id}

@api_router.get("/images")
async def list_images_public(page: Optional[str] = None, section: Optional[str] = None):
    """Public endpoint — returns image IDs for a given page (no base64 data)."""
    query = {}
    if page:
        query["page"] = page
    if section:
        query["section"] = section
    images = await db.site_images.find(query, {"data": 0}).sort("created_at", -1).to_list(100)
    return [{
        "id": str(img["_id"]),
        "name": img["name"],
        "mime_type": img["mime_type"],
        "page": img["page"],
        "section": img.get("section"),
    } for img in images]

@api_router.get("/images/{image_id}")
async def serve_image(image_id: str):
    from starlette.responses import Response
    import base64
    img = await db.site_images.find_one({"_id": ObjectId(image_id)}, {"data": 1, "mime_type": 1})
    if not img:
        raise HTTPException(status_code=404, detail="Image not found")
    raw = base64.b64decode(img["data"])
    return Response(content=raw, media_type=img["mime_type"], headers={"Cache-Control": "public, max-age=31536000"})


# ── Video (chunked upload + serve) ───────────────────────────────────────────

class VideoChunk(BaseModel):
    file_id: str
    chunk_index: int
    total_chunks: int
    name: str
    mime_type: str
    page: str = "hero"
    section: Optional[str] = None
    data: str  # base64 of this chunk

@api_router.post("/admin/videos/chunk")
async def upload_video_chunk(payload: VideoChunk, admin: dict = Depends(get_admin_user)):
    await db.video_chunks.insert_one({
        "file_id": payload.file_id,
        "chunk_index": payload.chunk_index,
        "total_chunks": payload.total_chunks,
        "name": payload.name,
        "mime_type": payload.mime_type,
        "page": payload.page,
        "section": payload.section,
        "data": payload.data,
    })
    received = await db.video_chunks.count_documents({"file_id": payload.file_id})
    if received == payload.total_chunks:
        chunks = await db.video_chunks.find(
            {"file_id": payload.file_id}, {"data": 1, "chunk_index": 1}
        ).sort("chunk_index", 1).to_list(None)
        assembled = "".join(c["data"] for c in chunks)
        result = await db.site_videos.insert_one({
            "name": payload.name,
            "data": assembled,
            "mime_type": payload.mime_type,
            "page": payload.page,
            "section": payload.section,
            "created_at": datetime.now(timezone.utc),
        })
        await db.video_chunks.delete_many({"file_id": payload.file_id})
        return {"status": "complete", "id": str(result.inserted_id)}
    return {"status": "chunk_received", "received": received, "total": payload.total_chunks}

@api_router.get("/admin/videos")
async def list_videos(admin: dict = Depends(get_admin_user)):
    videos = await db.site_videos.find({}, {"data": 0}).sort("created_at", -1).to_list(200)
    return [{
        "id": str(v["_id"]),
        "name": v["name"],
        "mime_type": v["mime_type"],
        "page": v["page"],
        "section": v.get("section"),
        "created_at": v["created_at"].isoformat(),
    } for v in videos]

@api_router.delete("/admin/videos/{video_id}")
async def delete_video(video_id: str, admin: dict = Depends(get_admin_user)):
    result = await db.site_videos.delete_one({"_id": ObjectId(video_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Video not found")
    return {"deleted": video_id}

@api_router.get("/videos")
async def list_videos_public(page: Optional[str] = None, section: Optional[str] = None):
    """Public endpoint — returns video metadata for a given page (no binary data)."""
    query = {}
    if page:
        query["page"] = page
    if section:
        query["section"] = section
    videos = await db.site_videos.find(query, {"data": 0}).sort("created_at", -1).to_list(100)
    return [{
        "id": str(v["_id"]),
        "name": v["name"],
        "mime_type": v["mime_type"],
        "page": v["page"],
        "section": v.get("section"),
    } for v in videos]

@api_router.get("/videos/{video_id}")
async def serve_video(video_id: str, request: Request):
    import base64
    from starlette.responses import Response
    video = await db.site_videos.find_one({"_id": ObjectId(video_id)}, {"data": 1, "mime_type": 1})
    if not video:
        raise HTTPException(status_code=404, detail="Video not found")
    raw = base64.b64decode(video["data"])
    total = len(raw)
    range_header = request.headers.get("range")
    if range_header:
        parts = range_header.replace("bytes=", "").split("-")
        start = int(parts[0])
        end = int(parts[1]) if parts[1] else total - 1
        end = min(end, total - 1)
        return Response(
            content=raw[start:end + 1],
            status_code=206,
            media_type=video["mime_type"],
            headers={
                "Content-Range": f"bytes {start}-{end}/{total}",
                "Accept-Ranges": "bytes",
                "Content-Length": str(end - start + 1),
                "Cache-Control": "public, max-age=31536000",
            },
        )
    return Response(
        content=raw,
        media_type=video["mime_type"],
        headers={
            "Accept-Ranges": "bytes",
            "Content-Length": str(total),
            "Cache-Control": "public, max-age=31536000",
        },
    )


app.include_router(api_router)

@app.get("/")
async def root():
    return {"status": "Krishi API running", "timestamp": datetime.now(timezone.utc).isoformat()}
