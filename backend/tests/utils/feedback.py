from httpx import AsyncClient
from tests.utils.cycles import create_test_cycle


async def create_test_feedback(
    client: AsyncClient, 
    auth_headers: dict
) -> dict:
    """Create a test feedback entry for testing."""
    # First create a cycle
    cycle_response = await create_test_cycle(client, auth_headers)
    cycle_id = cycle_response["id"]
    
    # Create feedback data
    feedback_data = {
        "cycle_id": str(cycle_id),
        "evaluator_email": "evaluator@example.com",
        "relation": "peer"
    }
    
    # Create feedback
    response = await client.post(
        "/api/feedback",
        json=feedback_data,
        headers=auth_headers
    )
    
    return response.json()


async def create_test_token(
    client: AsyncClient, 
    auth_headers: dict, 
    feedback_id: str
) -> str:
    """Create a test token for feedback."""
    response = await client.post(
        f"/api/feedback/{feedback_id}/token",
        headers=auth_headers
    )
    
    return response.json()["token"]


def get_feedback_form_data(questions):
    """
    Extract necessary data from a feedback form to create test submissions.
    """
    return {
        "questions": questions
    }


def create_test_answers(questions):
    """
    Create test answers for all questions in a form.
    """
    answers = []
    
    for question in questions:
        answer = {"question_id": question["id"]}
        
        # Generate appropriate test values based on question type
        if question["type"] == "rating":
            # Use middle value for ratings
            max_rating = 5
            if "options" in question and question["options"]:
                max_rating = max(opt["value"] for opt in question["options"])
            answer["value"] = max_rating // 2 + 1
        
        elif question["type"] == "multiplechoice":
            # Use first option for multiple choice
            if "options" in question and question["options"]:
                answer["value"] = question["options"][0]["value"]
            else:
                answer["value"] = "Option 1"
        
        elif question["type"] == "checkbox":
            # Select first option for checkboxes
            if "options" in question and question["options"]:
                answer["value"] = [question["options"][0]["value"]]
            else:
                answer["value"] = ["Option 1"]
        
        else:  # text, textarea
            answer["value"] = f"Test answer for {question['text']}"
        
        answers.append(answer)
    
    return answers