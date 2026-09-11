from langchain_core.messages import SystemMessage, HumanMessage

class DecisionSupportAgent:
    def __init__(self, llm):
        self.llm = llm
        self.system_prompt = SystemMessage(content='''
You are the Decision Support Agent for GeoVerse.
Your job is to synthesize all previous outputs (Plan, Data, Analysis, and Validation) into a final, user-friendly spatial decision report.
You must output a highly professional and explainable report in Markdown format. 
Highlight the "Final Recommendations" and "Key Geospatial Insights".
Do NOT output raw JSON, output beautiful Markdown designed for the end user to read.
''')

    def generate_report(self, plan: str, data: str, analysis: str, validation: str) -> str:
        prompt = f"Workflow Plan:\n{plan}\n\nRetrieved Data:\n{data}\n\nAnalysis Results:\n{analysis}\n\nValidation Status:\n{validation}\n\nPlease generate the final Markdown spatial decision report."
        response = self.llm.invoke([self.system_prompt, HumanMessage(content=prompt)])
        return response.content
