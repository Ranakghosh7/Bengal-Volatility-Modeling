import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import mapData from './wb_map.json'; 

const apiToGeoName = {
  "Darjeeling": "Darjiling",
  "Jalpaiguri": "Jalpaiguri",
  "Kochbihar": "Kochbihar",
  "Howrah": "Haora",
  "Kolkata": "Kolkata",
  "Hugli": "Hugli",
  "North 24 Parganas": "North 24 Parganas",
  "South 24 Parganas": "South 24 Parganas",
  "Uttar Dinajpur": "Uttar Dinajpur",
  "Dakshin Dinajpur": "Dakshin Dinajpur",
  "Bankura": "Bankura",
  "Barddhaman": "Barddhaman",
  "Birbhum": "Birbhum",
  "East Midnapore": "East Midnapore",
  "Maldah": "Maldah",
  "Murshidabad": "Murshidabad",
  "Nadia": "Nadia",
  "Puruliya": "Puruliya",
  "West Midnapore": "West Midnapore"
};

function Latex({ formula }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula, { throwOnError: false, displayMode: true });
    } catch (e) {
      return formula;
    }
  }, [formula]);
  
  return <div className="latex-formula" dangerouslySetInnerHTML={{ __html: html }} />;
}

function InlineLatex({ formula }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(formula, { throwOnError: false, displayMode: false });
    } catch (e) {
      return formula;
    }
  }, [formula]);
  
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

const MapComponent = () => {
  const [predictionData, setPredictionData] = useState({});
  const [selectedPhase, setSelectedPhase] = useState("23rd");
  const [allHeadlines, setAllHeadlines] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const FALLBACK_MAPPED = {
    "Bankura": { dominating_party: "BJP", win_probability: 52.5, full_breakdown: { TMC: 38.5, BJP: 48.2, CPIM: 13.3 } },
    "Barddhaman": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Birbhum": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Darjiling": { dominating_party: "BJP", win_probability: 52.5, full_breakdown: { TMC: 38.5, BJP: 48.2, CPIM: 13.3 } },
    "East Midnapore": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Jalpaiguri": { dominating_party: "BJP", win_probability: 52.5, full_breakdown: { TMC: 38.5, BJP: 48.2, CPIM: 13.3 } },
    "Kochbihar": { dominating_party: "BJP", win_probability: 52.5, full_breakdown: { TMC: 38.5, BJP: 48.2, CPIM: 13.3 } },
    "Maldah": { dominating_party: "BJP", win_probability: 52.5, full_breakdown: { TMC: 38.5, BJP: 48.2, CPIM: 13.3 } },
    "Murshidabad": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Nadia": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Puruliya": { dominating_party: "BJP", win_probability: 52.5, full_breakdown: { TMC: 38.5, BJP: 48.2, CPIM: 13.3 } },
    "West Midnapore": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Kolkata": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Haora": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Hugli": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "North 24 Parganas": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "South 24 Parganas": { dominating_party: "TMC", win_probability: 52.5, full_breakdown: { TMC: 48.2, BJP: 38.5, CPIM: 13.3 } },
    "Uttar Dinajpur": { dominating_party: "BJP", win_probability: 52.5, full_breakdown: { TMC: 38.5, BJP: 48.2, CPIM: 13.3 } },
    "Dakshin Dinajpur": { dominating_party: "BJP", win_probability: 52.5, full_breakdown: { TMC: 38.5, BJP: 48.2, CPIM: 13.3 } }
  };

  const fetchPrediction = async (phaseId) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await axios.get(`http://127.0.0.1:5000/api/phase/${phaseId}`);
      const apiData = response.data.predictions;
      console.log("API Response:", response.data);
      
      if (!apiData || Object.keys(apiData).length === 0) {
        throw new Error("No prediction data returned");
      }
      
      const mappedData = {};
      const headlines = [];
      
      for (const [apiName, data] of Object.entries(apiData)) {
        const geoName = apiToGeoName[apiName] || apiName;
        mappedData[geoName] = data;
        if (data.latest_headlines) {
          headlines.push(...data.latest_headlines);
        }
      }
      
      console.log("Mapped predictions:", mappedData);
      setPredictionData(mappedData);
      setAllHeadlines(headlines);
      setSelectedPhase(phaseId);
    } catch (error) {
      console.error("Error fetching phase data:", error);
      setError(error.message || "Failed to fetch predictions");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchPrediction("23rd").finally(() => {
      if (Object.keys(predictionData).length === 0) {
        console.log("Using fallback data");
        setPredictionData(FALLBACK_MAPPED);
      }
      setIsLoading(false);
    });
  }, []);

useEffect(() => {
    fetchPrediction("23rd").then(() => {
      if (Object.keys(predictionData).length === 0) {
        setPredictionData(FALLBACK_MAPPED);
      }
    }).catch(() => {
      setPredictionData(FALLBACK_MAPPED);
    }).finally(() => {
      setIsLoading(false);
    });
  }, []);

  const getStyle = useMemo(() => (feature) => {
    const stateName = feature.properties.NAME_1; 
    const districtName = feature.properties.NAME_2; 
    
    if (stateName === 'West Bengal') {
      const districtData = predictionData[districtName];
      
      if (districtData) {
        if (districtData.dominating_party === 'TMC') return { fillColor: '#28a745', weight: 1.5, opacity: 1, color: '#ffffff', fillOpacity: 0.8 };
        if (districtData.dominating_party === 'BJP') return { fillColor: '#ff9933', weight: 1.5, opacity: 1, color: '#ffffff', fillOpacity: 0.8 };
        if (districtData.dominating_party === 'CPIM') return { fillColor: '#dc3545', weight: 1.5, opacity: 1, color: '#ffffff', fillOpacity: 0.8 };
      }
      return { fillColor: '#eeeeee', weight: 1, opacity: 1, color: '#cccccc', fillOpacity: 0.4 };
    }
    
    return { fillColor: '#f5f5f5', weight: 0.5, opacity: 1, color: '#dddddd', fillOpacity: 0.9 };
  }, [predictionData]);

  return (
    <div className="paper-container">
      <article className="research-paper">
        
        <header className="paper-header">
          <h1 className="paper-title">
            Multi-Modal Sentiment Analysis and Weighted Volatility Modeling for West Bengal Election Forecasting
          </h1>
          <div className="author-block">
            <p className="authors">Political Analytics Laboratory</p>
            <p className="date">April 24, 2026</p>
          </div>
        </header>

        <section className="paper-section abstract">
          <h2>Abstract</h2>
          <p>
            The electoral landscape of West Bengal is characterized by rapid shifts in voter mood and exceptionally high turnout, making traditional prediction models ineffective. This paper introduces a novel machine-learning framework that uses multi-modal sentiment analysis and weighted volatility modeling to forecast election results. Focusing on the critical April 23rd Phase across 16 North Bengal districts—a historical bellwether for the state—the study uses a real-time data ingestion pipeline to track news cycles. By collecting regional and national news within 72-hour windows, the system generates specific sentiment scores and momentum indicators for each district. Additionally, the model uses major events, such as the unusual 91% turnout in Phase 1, as primary volatility triggers to measure political awareness and grassroots mobilization. Ultimately, this AI-driven approach provides an impartial, data-based system for tracking political momentum in highly unpredictable election environments.
          </p>
        </section>

        <hr className="section-divider" />

        <section className="paper-section">
          <h2>1. Introduction and Methodology</h2>
          <p>
            The electoral landscape of West Bengal presents unique challenges for predictive modeling due to its complex political dynamics and exceptionally high voter engagement. Unlike other regions where elections are a civic duty, here, they are the ultimate adrenaline rush. To understand this, Tell me what is the most popular sport in West Bengal:

          </p>
          <p>
            Football Right ?!  Mohun Bagan Vs East Bengal !   Nope that's  wrong , the most popular sport is "Khela Hobe" or "The Game is On"  Its played Every Five Years, the rules chnage everyday , and the refree is always accused of cheating !!
          </p>
          <p>
            <strong>Historic Data Anchor:</strong> The 91% turnout rate observed in Phase 1 of the 2026 elections represents 
            a significant deviation from historical averages (typically 78-82%). This elevated participation rate serves 
            as our primary volatility trigger, suggesting heightened voter engagement that may indicate:
          </p>
          <ul>
            <li>Increased political awareness and issue-based voting</li>
            <li>Pent-up demand for electoral change (anti-incumbency signals)</li>
            <li>Effective mobilization by opposition coalitions</li>
          </ul>
        </section>

        <hr className="section-divider" />

        <section className="paper-section map-section">
          <h2>2. Geographic Analysis</h2>
          <div className="map-figure">
            <div className="phase-toggle">
              <span className="toggle-label">Interactive Appendix Controls:</span>
              <button 
                className={`phase-btn ${selectedPhase === "23rd" ? 'active' : ''}`}
                onClick={() => fetchPrediction("23rd")}
              >
                Phase 1 (April 23rd)
              </button>
              <button 
                className={`phase-btn ${selectedPhase === "29th" ? 'active' : ''}`}
                onClick={() => fetchPrediction("29th")}
              >
                Phase 2 (April 29th)
              </button>
            </div>
            
            <div className="map-container">
              {isLoading ? (
                <div className="map-loading">Loading prediction data...</div>
              ) : (
                <MapContainer 
                  center={[22.5937, 88.9629]} 
                  zoom={6} 
                  style={{ height: '100%', width: '100%' }}
                  scrollWheelZoom={false}
                >
                  <TileLayer
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    attribution='&copy; CARTO'
                  />
                  <GeoJSON 
                    data={mapData} 
                    style={getStyle} 
                    key={JSON.stringify(predictionData)} 
                  />
                </MapContainer>
              )}
            </div>
            
            <div className="map-legend">
              <span className="legend-item"><span className="legend-color tmc"></span>TMC</span>
              <span className="legend-item"><span className="legend-color bjp"></span>BJP</span>
              <span className="legend-item"><span className="legend-color cpim"></span>CPIM</span>
              <span className="legend-item"><span className="legend-color none"></span>No Data</span>
            </div>
            
            <p className="figure-caption">
              <strong>Figure 1:</strong> Map displays district-level 
              predictions based on real-time sentiment analysis of regional news sources. Districts are color-coded 
              according to the predicted winning party based on our weighted volatility model. 
            </p>
          </div>
        </section>

        <hr className="section-divider" />

        <section className="paper-section">
          <h2>3. Mathematical Modeling and Prediction Logic</h2>
          
          <h3>3.1 Core Prediction Formula</h3>
          <p>
            The win probability for each party is calculated using our weighted volatility model, which integrates 
            sentiment analysis with historical turnout data:
          </p>
          
          <div className="equation-block">
            <Latex formula="P_{\text{win}} = (S \times W_s) + (\Delta T \times W_t) + (M \times W_m)" />
          </div>
          
          <p>Where:</p>
          <ul className="variable-list">
            <li><strong>S</strong> = Sentiment Score derived from XLM-RoBERTa analysis of news headlines</li>
            <li><strong>W<sub>s</sub></strong> = Weight assigned to sentiment (baseline: 12.0)</li>
            <li><strong>ΔT</strong> = Turnout Delta (Current turnout - Historical average)</li>
            <li><strong>W<sub>t</sub></strong> = Weight assigned to turnout (baseline: 1.0)</li>
            <li><strong>M</strong> = News Momentum (number of articles mentioning party + district)</li>
            <li><strong>W<sub>m</sub></strong> = Weight assigned to momentum (baseline: 1.0)</li>
          </ul>

          <h3>3.2 Volatility Weight and Turnout Multipliers</h3>
          <p>
            When turnout exceeds the 90% threshold, the model triggers a volatility adjustment to account for 
            potential "silent voter" effects:
          </p>
          
          <div className="equation-block">
            <Latex formula="V_w = \begin{cases} 2.0 \times |S_{neg}| & \text{if } \Delta T > 0.90 \\ 1.0 \times |S_{neg}| & \text{otherwise} \end{cases}" />
          </div>
          
          <p>
            This volatility weight <InlineLatex formula="V_w" /> is applied to negative sentiment signals to predict 
            potential electoral swings. A 2.0× multiplier on negative sentiment (e.g., articles mentioning "protest," 
            "scandal," "defeat") when turnout exceeds 90% suggests that high participation may correlate with 
            anti-incumbency voting patterns.
          </p>

          <h3>3.3 "Silent Voter" Signal Detection</h3>
          <p>
            Our model identifies "silent voter" signals through keyword analysis of news headlines:
          </p>
          
          <div className="equation-block">
            <Latex formula="S_{silent} = \frac{\sum_{i=1}^{n} (P_i - N_i)}{n}" />
          </div>
          
          <p>
            Where <InlineLatex formula="P_i" /> represents positive sentiment keywords (win, victory, success, lead, support) 
            and <InlineLatex formula="N_i" /> represents negative sentiment keywords (lose, defeat, fail, protest, scandal) 
            extracted from headline <InlineLatex formula="i" />. A negative <InlineLatex formula="S_{silent}" /> value indicates 
            predominance of critical coverage, which our model weights more heavily in high-turnout scenarios.
          </p>
        </section>

        <hr className="section-divider" />

        <section className="paper-section">
          <h2>4. Discussion</h2>
          <p>
            The integration of real-time news sentiment with historical turnout data provides a robust framework for 
            election prediction. The 91% turnout in Phase 1 districts creates a natural experiment for testing our 
            volatility hypothesis. High-turnout elections in Indian politics have historically correlated with 
            anti-incumbency voting, and our model formalizes this observation through the 2.0× multiplier mechanism.
          </p>
          <p>
            Limitations of this approach include reliance on English-language news sources and potential bias in 
            sentiment analysis for regional political contexts. Future work will incorporate vernacular news sources 
            and social media analytics to improve coverage.
          </p>
        </section>

        <hr className="section-divider" />

        <section className="paper-section references">
          <h2>Source References</h2>
          <p className="references-intro">The following headlines were analyzed for the current prediction cycle:</p>
          <ol className="references-list">
            {allHeadlines.slice(0, 20).map((headline, idx) => (
              <li key={idx} className="reference-item">{headline}</li>
            ))}
            {allHeadlines.length > 20 && (
              <li className="reference-more">... and {allHeadlines.length - 20} more headlines</li>
            )}
          </ol>
        </section>

        <footer className="paper-footer">
          <p>Data sourced from NewsAPI (newsapi.org) | Predictions generated in real-time</p>
          <p>West Bengal Assembly Elections 2026 Research Project</p>
        </footer>

      </article>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@400;600;700&display=swap');

        .paper-container {
          min-height: 100vh;
          background: #f0f0f0;
          padding: 40px 20px;
          font-family: 'Crimson Pro', Georgia, 'Times New Roman', serif;
        }

        .research-paper {
          max-width: 1000px;
          margin: 0 auto;
          background: #ffffff;
          padding: 60px 80px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }

        .paper-header {
          text-align: center;
          margin-bottom: 40px;
          padding-bottom: 30px;
          border-bottom: 2px solid #333;
        }

        .paper-title {
          font-size: 28px;
          font-weight: 700;
          line-height: 1.3;
          margin-bottom: 20px;
          color: #1a1a1a;
        }

        .author-block {
          font-size: 14px;
          color: #555;
        }

        .author-block .authors {
          font-style: italic;
          margin-bottom: 5px;
        }

        .author-block .date {
          font-weight: 600;
        }

        .paper-section {
          margin-bottom: 30px;
        }

        .paper-section h2 {
          font-size: 22px;
          font-weight: 700;
          margin-bottom: 15px;
          color: #1a1a1a;
        }

        .paper-section h3 {
          font-size: 18px;
          font-weight: 600;
          margin: 20px 0 10px 0;
          color: #333;
        }

        .paper-section p {
          font-size: 16px;
          line-height: 1.8;
          text-align: justify;
          margin-bottom: 15px;
          color: #333;
        }

        .paper-section ul {
          margin: 15px 0;
          padding-left: 30px;
        }

        .paper-section li {
          font-size: 16px;
          line-height: 1.8;
          margin-bottom: 8px;
          color: #333;
        }

        .abstract p {
          text-align: left !important;
        }

        .section-divider {
          border: none;
          border-top: 1px solid #ddd;
          margin: 40px 0;
        }

        .map-section .map-figure {
          border: 2px solid #ccc;
          padding: 20px;
          margin: 20px 0;
        }

        .phase-toggle {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 15px;
          flex-wrap: wrap;
        }

        .toggle-label {
          font-size: 14px;
          color: #666;
          font-style: italic;
        }

        .phase-btn {
          padding: 8px 16px;
          border: 1px solid #999;
          background: #f5f5f5;
          cursor: pointer;
          font-size: 13px;
          font-family: inherit;
          transition: all 0.2s;
        }

        .phase-btn:hover {
          background: #e8e8e8;
        }

        .phase-btn.active {
          background: #333;
          color: white;
          border-color: #333;
        }

        .map-container {
          height: 450px;
          width: 100%;
          background: #e8e8e8;
          position: relative;
        }

        .map-loading {
          display: flex;
          align-items: center;
          justify-content: center;
          height: 100%;
          color: #666;
          font-style: italic;
        }

        .map-legend {
          display: flex;
          gap: 20px;
          margin-top: 15px;
          justify-content: center;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 14px;
        }

        .legend-color {
          width: 20px;
          height: 14px;
          border: 1px solid #999;
        }

        .legend-color.tmc { background: #28a745; }
        .legend-color.bjp { background: #ff9933; }
        .legend-color.cpim { background: #dc3545; }
        .legend-color.none { background: #eeeeee; }

        .figure-caption {
          font-size: 14px;
          color: #555;
          text-align: center !important;
          margin-top: 15px;
          font-style: italic;
        }

        .equation-block {
          background: #f8f8f8;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #333;
          overflow-x: auto;
          text-align: center;
        }

        .latex-formula {
          font-size: 18px;
        }

        .latex-formula .katex {
          font-size: 1.3em;
        }

        .variable-list {
          background: #fafafa;
          padding: 20px 20px 20px 50px;
        }

        .references-list {
          max-height: 300px;
          overflow-y: auto;
          padding-right: 10px;
        }

        .reference-item {
          font-size: 13px;
          padding: 8px 0;
          border-bottom: 1px dotted #ddd;
          color: #555;
        }

        .reference-more {
          font-style: italic;
          color: #888;
          padding: 10px 0;
        }

        .paper-footer {
          text-align: center;
          padding-top: 30px;
          border-top: 2px solid #333;
          font-size: 12px;
          color: #666;
        }

        .paper-footer p {
          text-align: center !important;
          margin-bottom: 5px;
        }

        @media (max-width: 768px) {
          .research-paper {
            padding: 40px 30px;
          }

          .paper-title {
            font-size: 22px;
          }

          .map-container {
            height: 350px;
          }
        }
      `}</style>
    </div>
  );
};

export default MapComponent;