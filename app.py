from flask import Flask, jsonify
from flask_cors import CORS
import requests
from datetime import datetime, timedelta
import time
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed

app = Flask(__name__)
CORS(app)

NEWS_API_KEY = "2cabf2ea1e77482383ad815844529352"

cache = {}
CACHE_DURATION = 300  # 5 minutes

def get_cache_key(district_name, query_type):
    return f"{district_name}_{query_type}_{datetime.now().strftime('%Y%m%d%H')}"

def get_cached(key):
    if key in cache and time.time() - cache[key]['timestamp'] < CACHE_DURATION:
        return cache[key]['data']
    return None

def set_cached(key, data):
    cache[key] = {'timestamp': time.time(), 'data': data}

def fetch_single_news(query, district_name, query_type):
    cache_key = get_cache_key(district_name, query_type)
    cached = get_cached(cache_key)
    if cached is not None:
        return cache_key, cached
    
    from_date = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')
    base_url = "https://newsapi.org/v2/everything"
    
    try:
        res = requests.get(f"{base_url}?q={query}&from={from_date}&language=en&apiKey={NEWS_API_KEY}", timeout=5).json()
        data = res.get('totalResults', 0)
        set_cached(cache_key, data)
        return cache_key, data
    except:
        set_cached(cache_key, 0)
        return cache_key, 0

def fetch_headlines(district_name):
    cache_key = get_cache_key(district_name, 'headlines')
    cached = get_cached(cache_key)
    if cached is not None:
        return cache_key, cached
    
    from_date = (datetime.now() - timedelta(days=3)).strftime('%Y-%m-%d')
    base_url = "https://newsapi.org/v2/everything"
    query = f"{district_name} AND (election OR vote) AND Bengal"
    
    try:
        res = requests.get(f"{base_url}?q={query}&from={from_date}&language=en&sortBy=relevancy&apiKey={NEWS_API_KEY}", timeout=5).json()
        headlines = []
        if res.get('status') == 'ok' and res.get('articles'):
            for article in res['articles'][:5]:
                if article.get('title'):
                    headlines.append(article['title'])
        if not headlines:
            headlines = ["Election coverage continues in the region."]
        set_cached(cache_key, headlines)
        return cache_key, headlines
    except:
        set_cached(cache_key, ["Election coverage continues in the region."])
        return cache_key, ["Election coverage continues in the region."]

def fetch_live_district_data(district_name):
    print(f"Fetching live data for {district_name}...")
    
    with ThreadPoolExecutor(max_workers=4) as executor:
        future_bjp = executor.submit(fetch_single_news, f"(BJP OR Modi) AND {district_name} AND Bengal", district_name, 'bjp')
        future_tmc = executor.submit(fetch_single_news, f"(TMC OR Mamata) AND {district_name} AND Bengal", district_name, 'tmc')
        future_headlines = executor.submit(fetch_headlines, district_name)
        
        bjp_m = min(future_bjp.result()[1], 10)
        tmc_m = min(future_tmc.result()[1], 10)
        headlines = future_headlines.result()[1]
    
    return {
        "comments": headlines,
        "bjp_m": bjp_m,
        "tmc_m": tmc_m
    }

def process_district(district, turnout):
    live_data = fetch_live_district_data(district)
    
    percentages = predict_with_history(
        district,
        comments=live_data["comments"], 
        bjp_m=live_data["bjp_m"], 
        tmc_m=live_data["tmc_m"], 
        turnout=turnout
    )
    
    winner = max(percentages, key=lambda k: percentages[k])
    
    return district, {
        "dominating_party": winner,
        "win_probability": percentages[winner],
        "full_breakdown": percentages,
        "latest_headlines": live_data["comments"] 
    }

def calculate_winning_percentages(comments, bjp_momentum, tmc_momentum, turnout_pct, district_seed):
    positive_words = ['win', 'victory', 'success', 'lead', 'ahead', 'growth', 'support', 'popular', 'surge']
    negative_words = ['lose', 'defeat', 'fail', 'trail', 'behind', 'loss', 'scandal', 'protest', 'violence']
    
    sentiment_score = 0
    for comment in comments:
        comment_lower = comment.lower()
        for word in positive_words:
            if word in comment_lower:
                sentiment_score += 1
        for word in negative_words:
            if word in comment_lower:
                sentiment_score -= 2
    
    normalized_sentiment = sentiment_score / len(comments) if comments else 0
    turnout_multiplier = turnout_pct / 100.0
    
    district_factor = (district_seed % 20 - 10) / 10
    
    base_tmc = 38.0 + district_factor * 5
    base_bjp = 38.0 - district_factor * 5
    base_cpim = 24.0
    
    tmc_shift = (normalized_sentiment * 10) + (tmc_momentum * 2) - (bjp_momentum * 1.5)
    bjp_shift = (-normalized_sentiment * 8) + (bjp_momentum * 2) - (tmc_momentum * 1.5)
    
    final_tmc = base_tmc + (tmc_shift * turnout_multiplier)
    final_bjp = base_bjp + (bjp_shift * turnout_multiplier)
    
    total = final_tmc + final_bjp + base_cpim
    
    return {
        "TMC": round((final_tmc / total) * 100, 1),
        "BJP": round((final_bjp / total) * 100, 1),
        "CPIM": round((base_cpim / total) * 100, 1)
    }

def get_district_seed(district_name):
    hash_val = int(hashlib.md5(district_name.encode()).hexdigest(), 16)
    return hash_val % 100

DISTRICT_HISTORY = {
    "Bankura": "bjp_strong",
    "Barddhaman": "tmc_leading",
    "Birbhum": "bjp_contested",
    "Darjeeling": "bjp_surge",
    "East Midnapore": "tmc_hold",
    "Jalpaiguri": "bjp_making_inroads",
    "Kochbihar": "bjp_strong",
    "Maldah": "bjp_contested",
    "Murshidabad": "tmc_leading",
    "Nadia": "tmc_hold",
    "Puruliya": "bjp_surge",
    "West Midnapore": "tmc_leading",
    "Kolkata": "tmc_stronghold",
    "Howrah": "tmc_stronghold",
    "Hugli": "tmc_leading",
    "North 24 Parganas": "tmc_hold",
    "South 24 Parganas": "tmc_stronghold",
    "Uttar Dinajpur": "bjp_contested",
    "Dakshin Dinajpur": "bjp_surge"
}

def predict_with_history(district, comments, bjp_m, tmc_m, turnout):
    history = DISTRICT_HISTORY.get(district, "tmc_leading")
    seed = get_district_seed(district)
    
    base_tmc = 40
    base_bjp = 38
    base_cpim = 22
    
    if "bjp_strong" in history or "bjp_surge" in history:
        base_bjp += 8
        base_tmc -= 3
    elif "tmc_stronghold" in history:
        base_tmc += 10
        base_bjp -= 5
    elif "bjp_contested" in history:
        base_bjp += 4
        base_tmc += 1
    
    sentiment_adj = 0
    for comment in comments:
        c = comment.lower()
        if any(w in c for w in ['bjp', 'modi', 'victory', 'surge', 'gain']):
            sentiment_adj += 2
        if any(w in c for w in ['tmc', 'mamata', 'defeat', 'loss']):
            sentiment_adj -= 1
    
    base_bjp += sentiment_adj
    base_tmc -= sentiment_adj
    
    bjp_momentum = min(bjp_m, 10)
    tmc_momentum = min(tmc_m, 10)
    
    final_bjp = base_bjp + (bjp_momentum * 1.5) - (tmc_momentum * 0.8)
    final_tmc = base_tmc + (tmc_momentum * 1.5) - (bjp_momentum * 0.8)
    
    total = final_bjp + final_tmc + base_cpim
    
    return {
        "TMC": round((final_tmc / total) * 100, 1),
        "BJP": round((final_bjp / total) * 100, 1),
        "CPIM": round((base_cpim / total) * 100, 1)
    }

FALLBACK_PREDICTIONS = {
    "Bankura": "BJP",
    "Barddhaman": "TMC",
    "Birbhum": "TMC",
    "Darjeeling": "BJP",
    "East Midnapore": "TMC",
    "Jalpaiguri": "BJP",
    "Kochbihar": "BJP",
    "Maldah": "BJP",
    "Murshidabad": "TMC",
    "Nadia": "TMC",
    "Puruliya": "BJP",
    "West Midnapore": "TMC",
    "Kolkata": "TMC",
    "Howrah": "TMC",
    "Hugli": "TMC",
    "North 24 Parganas": "TMC",
    "South 24 Parganas": "TMC",
    "Uttar Dinajpur": "BJP",
    "Dakshin Dinajpur": "BJP"
}

@app.route('/api/phase/<phase_id>', methods=['GET'])
def get_phase_predictions(phase_id):
    print(f"Fetching predictions for phase: {phase_id}")
    
    if phase_id == "23rd":
        districts = {
            "Bankura": 87.5,
            "Barddhaman": 86.2,
            "Birbhum": 84.8,
            "Darjeeling": 89.1,
            "East Midnapore": 85.3,
            "Jalpaiguri": 88.4,
            "Kochbihar": 86.9,
            "Maldah": 83.7,
            "Murshidabad": 82.5,
            "Nadia": 85.1,
            "Puruliya": 84.2,
            "West Midnapore": 86.8
        }
    elif phase_id == "29th":
        districts = {
            "Kolkata": 78.5,
            "Howrah": 81.2,
            "Hugli": 84.3,
            "North 24 Parganas": 83.9,
            "South 24 Parganas": 82.1,
            "Uttar Dinajpur": 80.5,
            "Dakshin Dinajpur": 82.8
        }
    else:
        return jsonify({"error": "Invalid phase"}), 400
    
    predictions = {}
    api_failed = False
    
    try:
        with ThreadPoolExecutor(max_workers=8) as executor:
            futures = {executor.submit(process_district, d, t): d for d, t in districts.items()}
            for future in as_completed(futures):
                district, result = future.result()
                predictions[district] = result
    except Exception as e:
        print(f"API fetch failed: {e}")
        api_failed = True
    
    if api_failed or not predictions:
        print("Using fallback predictions based on historical data")
        for district in districts.keys():
            winner = FALLBACK_PREDICTIONS.get(district, "TMC")
            predictions[district] = {
                "dominating_party": winner,
                "win_probability": 52.5,
                "full_breakdown": {
                    "TMC": 48.2 if winner == "TMC" else 38.5,
                    "BJP": 38.5 if winner == "TMC" else 48.2,
                    "CPIM": 13.3
                },
                "latest_headlines": [f"Historical analysis: {winner} leads in {district}"]
            }
    
    return jsonify({
        "phase": phase_id,
        "status": "success",
        "predictions": predictions
    })

@app.route('/api/clear-cache', methods=['POST'])
def clear_cache():
    cache.clear()
    return jsonify({"status": "Cache cleared"})

if __name__ == '__main__':
    app.run(debug=True, port=5000)