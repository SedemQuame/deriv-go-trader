package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson"
)

// AI Request Structure
type AIRequest struct {
	UserPrompt string `json:"prompt"`
}

type AIResponse struct {
	Reply string `json:"reply"`
}

// OpenAI structures
type OpenAIRequest struct {
	Model    string          `json:"model"`
	Messages []OpenAIMessage `json:"messages"`
}

type OpenAIMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type OpenAIResponse struct {
	Choices []struct {
		Message OpenAIMessage `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func handleAIAnalyze(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sysConfigMu.RLock()
	apiKey := sysConfig.OpenAIKey
	sysConfigMu.RUnlock()

	if apiKey == "" {
		http.Error(w, "AI Service not configured. Please add OpenAI API Key in Settings.", http.StatusForbidden)
		return
	}

	var req AIRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		// Proceed with empty prompt if decode fails, just analyze based on data
	}

	// 1. RAG Retrieve: Fetch Context
	contextStr := buildContext(r)

	// 2. prompt Construction
	systemPrompt := `You are an expert Trading Analyst AI. 
	Your goal is to analyze the user's trading performance and provide actionable insights.
	You have access to their recent trades, logs, and journal entries.
	
	Rules:
	- Be professional but encouraging.
	- Focus on patterns (e.g., revenge trading, winning streaks, time of day).
	- Suggest improvements based on data.
	- If the user asks a specific question, answer it using the data provided.
	- Output your response in Markdown.`

	userMessage := fmt.Sprintf("Here is my trading data:\n\n%s\n\nUser Question/Focus: %s", contextStr, req.UserPrompt)

	// 3. Call LLM
	reply, err := callOpenAI(apiKey, "", systemPrompt, userMessage)
	if err != nil {
		// Log error but fallback to local analysis
		fmt.Printf("AI Service Error (Fallback initiated): %v\n", err)

		// If 429 or other error, return local analysis
		reply = generateLocalAnalysis(r)
	}

	// 4. Return Response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AIResponse{Reply: reply})
}

func buildContext(r *http.Request) string {
	if dbClient == nil {
		return "Database unavailable."
	}

	// Get last 20 trades
	trades, _ := dbClient.GetTrades(r.Context(), bson.M{}, 20)
	// Get last 3 journal entries
	journals, _ := dbClient.GetJournalEntries(r.Context(), 3)
	// Get Sessions stats
	sessions, _ := dbClient.GetSessions(r.Context(), 3)

	var sb strings.Builder

	sb.WriteString("### Recent Sessions:\n")
	for _, s := range sessions {
		sb.WriteString(fmt.Sprintf("- Session %s: PnL: %.2f, Total Trades: %d (Win: %d/Loss: %d)\n", s.StartTime.Format(time.RFC3339), s.TotalPnL, s.TotalTrades, s.WinningTrades, s.LosingTrades))
	}

	sb.WriteString("\n### Recent Trades (Last 20):\n")
	for _, t := range trades {
		sb.WriteString(fmt.Sprintf("- %s | %s | %s | PnL: %.2f\n", t.Timestamp.Format("15:04:05"), t.Strategy, t.ContractType, t.Profit))
	}

	sb.WriteString("\n### Recent Journal Entries:\n")
	for _, j := range journals {
		sb.WriteString(fmt.Sprintf("- [%s] %s: %s\n", j.CreatedAt.Format("2006-01-02"), j.Title, j.Content))
	}

	return sb.String()
}

func callOpenAI(apiKey, modelOverride, systemPrompt, userMessage string) (string, error) {
	// Determine Model: defaults to gpt-3.5-turbo if not set
	model := "gpt-3.5-turbo"

	// If override provided, use it
	if modelOverride != "" {
		model = modelOverride
	} else {
		// Else check config
		sysConfigMu.RLock()
		if sysConfig.OpenAIModel != "" {
			model = sysConfig.OpenAIModel
		}
		sysConfigMu.RUnlock()
	}

	reqBody := OpenAIRequest{
		Model: model,
		Messages: []OpenAIMessage{
			{Role: "system", Content: systemPrompt},
			{Role: "user", Content: userMessage},
		},
	}

	jsonData, _ := json.Marshal(reqBody)

	req, err := http.NewRequest("POST", "https://api.openai.com/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}

	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+apiKey)

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)

	if resp.StatusCode != 200 {
		return "", fmt.Errorf("OpenAI API returned status %d: %s", resp.StatusCode, string(body))
	}

	var openAIResp OpenAIResponse
	if err := json.Unmarshal(body, &openAIResp); err != nil {
		return "", err
	}

	if len(openAIResp.Choices) > 0 {
		return openAIResp.Choices[0].Message.Content, nil
	}

	return "No response generated.", nil
}

// Strategy Generation
// Strategy Generation
type AIStrategyRequest struct {
	UserPrompt string `json:"prompt"`
	Mode       string `json:"mode"`  // "custom" or "dbot"
	Model      string `json:"model"` // "gpt-3.5-turbo", "gpt-4", etc.
}

func handleAIGenerateStrategy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	sysConfigMu.RLock()
	apiKey := sysConfig.OpenAIKey
	sysConfigMu.RUnlock()

	if apiKey == "" {
		http.Error(w, "AI Service not configured.", http.StatusForbidden)
		return
	}

	var req AIStrategyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	var systemPrompt string
	var userMessage string

	if req.Mode == "dbot" {
		systemPrompt = `You are an expert Deriv DBot Strategy Developer.
		Your task is to generate the XML code for a Deriv DBot strategy based on the user's requirements.
		The output must be a valid XML string that can be imported into Deriv DBot.
		
		CRITICAL: You MUST use the EXACT XML structure below. Do not invent new block types.
		Use 'text' shadows for MARKET, TRADETYPE, CANDLEINTERVAL.
		
		Template to follow:
		<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
		  <block type="trade_definition" id="trade_def" x="0" y="0">
		    <value name="TRADETYPE">
		      <shadow type="text">
		        <field name="TEXT">calle</field> <!-- 'call', 'put', 'rise', 'fall', etc. -->
		      </shadow>
		    </value>
		    <value name="MARKET">
		      <shadow type="text">
		        <field name="TEXT">R_100</field> <!-- Market symbol e.g., R_100, 1HZ100V -->
		      </shadow>
		    </value>
		    <value name="CANDLEINTERVAL">
		      <shadow type="text">
		        <field name="TEXT">1m</field>
		      </shadow>
		    </value>
		    <value name="RESTARTBUYSELL">
		      <shadow type="math_number">
		        <field name="NUM">1</field>
		      </shadow>
		    </value>
		    <value name="RESTARTONERROR">
		      <shadow type="math_number">
		        <field name="NUM">1</field>
		      </shadow>
		    </value>
		  </block>
		  
		  <block type="before_purchase" id="strategy" x="0" y="220">
		    <statement name="statement">
		       <!-- INSERT STRATEGY LOGIC HERE -->
		       <!-- Example: Purchase block -->
		       <block type="purchase" id="purchase_call">
		        <value name="BET">
		          <shadow type="math_number">
		            <field name="NUM">1</field> <!-- Stake Amount -->
		          </shadow>
		        </value>
		       </block>
		    </statement>
		  </block>
		  
		  <block type="during_purchase" id="during_purch" x="0" y="420"></block>
		  
		  <block type="after_purchase" id="after_purch" x="0" y="620">
		    <statement name="statement">
		      <!-- INSERT POST-TRADE LOGIC HERE (Martingale etc) -->
		      <block type="trade_again" id="trade_again"></block>
		    </statement>
		  </block>
		</xml>
		
		Rules:
		1. OUTPUT ONLY the XML. No markdown code blocks.
		2. Generate unique IDs for blocks where possible (or just use random strings).
		3. Valid 'TRADETYPE' values: 'call', 'put', 'rise', 'fall', 'digit', 'high', 'low'.
		4. Valid 'MARKET' values: 'R_100', 'R_10', 'R_25', 'R_50', 'R_75', '1HZ100V' (Volatility 100 1s).
		5. Fill in the "before_purchase" statement with logic if requested (e.g. Indicators).
		6. MANDATORY: The "before_purchase" block MUST contain a "purchase" block. Do not delete it.
		`
		userMessage = fmt.Sprintf("Create a complete Deriv DBot XML strategy for: %s", req.UserPrompt)
	} else {
		// Default to Custom JS
		systemPrompt = `You are an expert Automated Trading Strategy Developer.
		You write Javascript code for a specific trading bot environment.
		
		API Reference:
		- function onTick(quote): Called on every new price tick. 'quote' is a float.
		- function log(message): Logs a string to the console.
		- function buy(contractType, amount): Executes a trade. contractType is "CALL" (Rise) or "PUT" (Fall). amount is the stake.
		- function getInitialStake(): Returns the configured initial stake amount.
		- function getSymbol(): Returns the configured symbol.
		
		Rules:
		1. OUTPUT ONLY JAVASCRIPT CODE. Do not include markdown formatting or "Here is the code". Just the code.
		2. The code must define the 'onTick' function.
		3. Keep logic simple and robust.
		4. Use the provided API functions.
		5. Do not use external libraries.
		
		Example:
		var lastQuote = 0;
		function onTick(quote) {
			if(lastQuote > 0 && quote > lastQuote) {
				buy("CALL", getInitialStake());
			}
			lastQuote = quote;
		}`
		userMessage = fmt.Sprintf("Create a strategy based on this requirement: %s", req.UserPrompt)
	}

	code, err := callOpenAI(apiKey, req.Model, systemPrompt, userMessage)
	if err != nil {
		// Fallback for demo purposes if API fails (e.g. quota)
		fmt.Printf("AI Strategy Gen Error: %v\n", err)
		code = generateFallbackStrategy(req.UserPrompt, req.Mode)
	} else {
		// Strip markdown code blocks if present
		code = strings.TrimPrefix(code, "```javascript")
		code = strings.TrimPrefix(code, "```js")
		code = strings.TrimPrefix(code, "```xml")
		code = strings.TrimPrefix(code, "```")
		code = strings.TrimSuffix(code, "```")
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(AIResponse{Reply: code})
}

func generateFallbackStrategy(prompt, mode string) string {
	if mode == "dbot" {
		return `<!-- Fallback DBot XML (AI Unavailable) -->
<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <block type="trade_definition" x="0" y="0">
    <statement name="TRADE_OPTIONS">
      <block type="trade_definition_market" id="market">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">R_100</field>
      </block>
    </statement>
    <statement name="INITIALIZATION">
        <block type="text_print">
            <value name="TEXT">
                <shadow type="text">
                    <field name="TEXT">Bot Started</field>
                </shadow>
            </value>
        </block>
    </statement>
  </block>
</xml>`
	}

	// Simple keyword matching for fallback JS
	prompt = strings.ToLower(prompt)

	if strings.Contains(prompt, "rsi") {
		return `// Fallback RSI Strategy (Simulated logic as real RSI requires history)
var prices = [];
function onTick(quote) {
    prices.push(quote);
    if(prices.length > 14) {
        prices.shift();
        // Calculate RSI logic here...
        // Placeholder simple logic:
        var change = prices[prices.length-1] - prices[prices.length-2];
        if(change > 0) log("Up trend");
    }
}`
	}

	return `// Fallback Strategy (AI Service Unavailable)
// Generated for: ` + prompt + `
var lastQuote = 0;
function onTick(quote) {
    log("Tick: " + quote);
    if (lastQuote != 0) {
        if (quote > lastQuote) {
            log("Price went up");
            // buy("CALL", getInitialStake());
        } else if (quote < lastQuote) {
             log("Price went down");
             // buy("PUT", getInitialStake());
        }
    }
    lastQuote = quote;
}`
}

// Fallback Local Analyst
func generateLocalAnalysis(r *http.Request) string {
	if dbClient == nil {
		return "Unable to access trading data for analysis."
	}

	// Fetch robust dataset
	trades, _ := dbClient.GetTrades(r.Context(), bson.M{}, 50)
	report := calculateReport(trades) // Reusing logic from analytics.go (assuming in same package)

	var sb strings.Builder
	sb.WriteString("### **Automated Market Analysis (Offline Mode)**\n\n")
	sb.WriteString("*Note: OpenAI Service is unavailable. Using algorithmic heuristics.* \n\n")

	// 1. Performance Overview
	sb.WriteString("#### Performance Overview\n")
	sb.WriteString(fmt.Sprintf("- **Win Rate:** %.1f%%\n", report.WinRate))
	sb.WriteString(fmt.Sprintf("- **Profit Factor:** %.2f\n", report.ProfitFactor))
	sb.WriteString(fmt.Sprintf("- **Total PnL:** $%.2f\n\n", report.TotalProfit))

	// 2. Pattern Recognition
	sb.WriteString("#### Insights & Patterns\n")

	// Insight: Streak Analysis
	if report.LongestStreakLoss >= 3 {
		sb.WriteString(fmt.Sprintf("- **Warning:** You recently experienced a losing streak of %d trades. Consider implementing a 'Cool Down' period after 3 consecutive losses to avoid revenge trading.\n", report.LongestStreakLoss))
	} else if report.LongestStreakWin >= 5 {
		sb.WriteString(fmt.Sprintf("- **Good Momentum:** You hit a winning streak of %d trades. Be cautious of overconfidence; ensure you stick to your take-profit rules.\n", report.LongestStreakWin))
	}

	// Insight: Win Rate Reality Check
	if report.WinRate < 45.0 {
		sb.WriteString("- **Strategy Adjustment Needed:** Your win rate is below 45%. If you are using a Martingale strategy, this is high risk. Consider reviewing your entry indicators or reducing your initial stake.\n")
	} else if report.WinRate > 60.0 {
		sb.WriteString("- **Strong Performance:** Your strategy is performing well above the break-even threshold for most payout ratios.\n")
	}

	// Insight: Profit Factor
	if report.ProfitFactor < 1.0 {
		sb.WriteString("- **Negative Expectancy:** For every $1 lost, you are making less than $1 back. Focus on cutting losses earlier or increasing your risk-reward ratio.\n")
	}

	// 3. Actionable Advice
	sb.WriteString("\n#### Recommended Actions\n")
	sb.WriteString("1. **Review Losing Trades:** Check the 'Trades' tab and analyze the specific time/contract type of your largest losses.\n")
	sb.WriteString("2. **Risk Management:** Ensure your stop loss is hard-coded. Do not override it manually.\n")
	sb.WriteString("3. **Journaling:** Write a journal entry about your emotions during the last session. Were you anxious or calm?\n")

	return sb.String()
}
