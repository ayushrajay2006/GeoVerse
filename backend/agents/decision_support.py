from langchain_core.messages import SystemMessage, HumanMessage

class DecisionSupportAgent:
    def __init__(self, llm):
        self.llm = llm
        self.system_prompt = SystemMessage(content='''
You are the Decision Support Agent for GeoVerse.
Your job is to synthesize all previous outputs (Plan, Data, Analysis, and Validation) into a final, user-friendly spatial decision report in Markdown format.
Use standard GitHub Flavored Markdown for tables (do NOT use --- unless it's a valid markdown table separator).
''')

    def generate_report(self, plan: str, data: str, analysis: str, validation: str, mode: str = "professional") -> str:
        if mode == "simple":
            instructions = """
MODE: SIMPLE (Non-Technical User)
Instructions:
1. Provide a very concise, easy-to-understand **Executive Summary** of what was discovered.
2. Clearly explain **why** this specific answer/finding is the best and most accurate based on the data.
3. Provide 2-3 clear, actionable recommendations.
4. Avoid dense technical GIS jargon (no mention of Random Forest, RMSE, projections, etc. unless absolutely necessary).
5. Output beautiful Markdown. Use markdown tables for data if applicable.
"""
        else:
            instructions = """
MODE: PROFESSIONAL (GIS/Data Scientist)
Instructions:
1. Provide an **In-Depth Technical Analysis** detailing the *what*, *why*, and *how* the insights were figured out.
2. Detail the exact methodologies used (e.g., specific satellite sensors used, resolution, classification models like Random Forest, validation metrics).
3. Provide a structured markdown table summarizing the quantitative findings.
4. Include a section on data validation and confidence intervals.
5. Provide advanced, specialized recommendations.
6. Output beautiful, structured Markdown.
"""

        prompt = f"""
Workflow Plan:\n{plan}\n
Retrieved Data:\n{data}\n
Analysis Results:\n{analysis}\n
Validation Status:\n{validation}\n\n
{instructions}
"""
        response = self.llm.invoke([self.system_prompt, HumanMessage(content=prompt)])
        return response.content
