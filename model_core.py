import pandas as pd
from transformers import pipeline


sentiment_model = pipeline("sentiment-analysis", model="cardiffnlp/twitter-xlm-roberta-base-sentiment")

def calculate_realtime_score(comments, rally_count, turnout_pct):
    
    results = sentiment_model(comments)
    sentiment_score = sum([1 if r['label'] == 'Positive' else -1 for r in results])
    
     
   
    dominance_weight = (rally_count * 0.4) + (turnout_pct * 0.6)
    
    return sentiment_score * dominance_weight


comments_data = ["Ebaar bhalo vote hobe", "Churi cholbe na", "Didi e thakbe"]
score = calculate_realtime_score(comments_data, rally_count=5, turnout_pct=91.58)
print(f"Constituency Momentum Score: {score}")

