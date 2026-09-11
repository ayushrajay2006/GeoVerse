from langchain_core.messages import SystemMessage, HumanMessage

class AnalysisAgent:
    def __init__(self, llm):
        self.llm = llm
        self.system_prompt = SystemMessage(content='''
You are the Analysis Agent for GeoVerse. 
Your job is to execute the analysis steps defined in the workflow using the retrieved datasets.
Since this is a simulated environment right now, you will read the requested analysis and the mock retrieved data,
and you will generate a JSON response containing 'analysis_results' (a summary of findings) and 'insights' (key takeaways).
''')

    def analyze(self, plan_json: str, data_json: str) -> str:
        prompt = f"Plan:\n{plan_json}\n\nRetrieved Data:\n{data_json}\n\nPlease perform the theoretical analysis and return a JSON object with 'analysis_results' and 'insights'."
        response = self.llm.invoke([self.system_prompt, HumanMessage(content=prompt)])
        return response.content
