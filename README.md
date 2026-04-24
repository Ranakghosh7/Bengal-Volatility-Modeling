# 🗳️ Bengal Volatility Modeling: The "Khela Hobe" Framework

Predicting elections in West Bengal isn't just a data science problem—it's trying to quantify pure chaos. 

In most places, voting is a quiet civic duty. In Bengal, it's a high-stakes sport known locally as **"Khela Hobe"** *(The game is on)*. The rules shift daily, the momentum swings wildly, and everyone thinks the referee is cheating. 

This project aims to be that impartial, AI-driven referee. We are building a multi-modal machine learning framework designed specifically to handle the extreme volatility of West Bengal elections, starting with the critical April 23rd Phase.

## 🎯 What Does This Model Do?

Traditional election forecasting fails here because it relies on standard polling. Our framework ditches that approach and focuses on real-time sentiment and momentum. 

We specifically track **16 districts in North Bengal** (including Darjeeling, Jalpaiguri, and Cooch Behar). In Bengal politics, there is a golden rule: whoever wins the hills and the tea gardens usually wins the state. This region is our ultimate bellwether.

## ⚙️ How It Works (Under the Hood)

1. **Real-Time Data Ingestion:** We use a NewsAPI pipeline to constantly scrape regional and national news. The system pulls articles within a rolling 72-hour window, generating fresh sentiment scores for each district.
   
2. **Multi-Modal Sentiment Analysis:** We don't just look at who is being talked about; we look at *how* they are being talked about, extracting the underlying mood of the grassroots voters.

3. **Weighted Volatility Triggers:** We anchor our predictions against historic anomalies. For example, Phase 1 saw a massive **91% voter turnout** (compared to the usual 78-82%). Our model treats this kind of spike as a "Volatility Trigger," indicating either heavy anti-incumbency or massive grassroots mobilization.

## 🚀 Getting Started

If you want to spin this up locally and see the data pipeline in action:

```bash
# 1. Clone the repository
git clone [https://github.com/Ranakghosh7/Bengal-Volatility-Modeling.git](https://github.com/Ranakghosh7/Bengal-Volatility-Modeling.git)

# 2. Navigate into the directory
cd Bengal-Volatility-Modeling

# 3. Install the required dependencies
npm install  # (or pip install -r requirements.txt if using Python)

# 4. Run the data ingestion pipeline
npm start
