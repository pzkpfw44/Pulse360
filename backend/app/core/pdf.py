import logging
import os
from typing import Dict, List, Any, Optional
from datetime import datetime
from fpdf import FPDF, HTMLMixin

logger = logging.getLogger(__name__)


class PDF(FPDF, HTMLMixin):
    """Extended FPDF class with headers and footers"""
    
    def __init__(self, title: str, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.title = title
        self.set_author("Pulse360")
        self.set_creator("Pulse360")
        self.set_title(title)
    
    def header(self):
        """Add header to each page"""
        # Logo (if exists)
        logo_path = os.path.join(os.path.dirname(__file__), "../../static/logo.png")
        if os.path.exists(logo_path):
            self.image(logo_path, 10, 8, 33)
            self.set_x(45)
        else:
            self.set_x(10)
        
        # Title
        self.set_font("Arial", "B", 15)
        self.set_text_color(0, 51, 102)  # Dark blue
        self.cell(0, 10, self.title, 0, 1, "L")
        
        # Line break
        self.ln(5)
    
    def footer(self):
        """Add footer to each page"""
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        
        # Add page number
        self.set_font("Arial", "I", 8)
        self.set_text_color(128, 128, 128)  # Gray
        self.cell(0, 10, f"Page {self.page_no()}", 0, 0, "C")
        
        # Add timestamp on the right
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        self.cell(0, 10, f"Generated: {timestamp}", 0, 0, "R")
    
    def chapter_title(self, title: str):
        """Add a chapter title"""
        self.set_font("Arial", "B", 12)
        self.set_fill_color(240, 240, 240)  # Light gray
        self.set_text_color(0, 51, 102)  # Dark blue
        self.cell(0, 10, title, 0, 1, "L", True)
        self.ln(4)
    
    def section_title(self, title: str):
        """Add a section title"""
        self.set_font("Arial", "B", 11)
        self.set_text_color(0, 0, 0)  # Black
        self.cell(0, 6, title, 0, 1, "L")
        self.ln(2)
    
    def paragraph(self, text: str):
        """Add a paragraph of text"""
        self.set_font("Arial", "", 10)
        self.set_text_color(0, 0, 0)  # Black
        self.multi_cell(0, 5, text)
        self.ln()
    
    def bullet_point(self, text: str):
        """Add a bullet point"""
        self.set_font("Arial", "", 10)
        self.set_text_color(0, 0, 0)  # Black
        self.cell(5, 5, chr(149), 0, 0, "C")  # Bullet character
        self.cell(0, 5, text, 0, 1)
    
    def rating_bar(self, value: float, max_value: float = 5.0, width: float = 100.0):
        """Add a graphical rating bar"""
        x = self.get_x()
        y = self.get_y()
        
        # Draw background bar
        self.set_fill_color(240, 240, 240)  # Light gray
        self.rect(x, y, width, 5, "F")
        
        # Draw filled portion
        fill_width = (value / max_value) * width
        self.set_fill_color(65, 105, 225)  # Royal blue
        self.rect(x, y, fill_width, 5, "F")
        
        # Add value text
        self.set_x(x + width + 5)
        self.cell(10, 5, f"{value:.1f}", 0, 1)
    
    def add_stat_box(self, title: str, value: str, color: tuple = (65, 105, 225)):
        """Add a stat box with title and value"""
        self.set_fill_color(*color)
        self.set_text_color(255, 255, 255)  # White
        self.set_font("Arial", "B", 10)
        self.cell(40, 8, title, 1, 0, "C", True)
        
        self.set_fill_color(240, 240, 240)  # Light gray
        self.set_text_color(0, 0, 0)  # Black
        self.set_font("Arial", "", 10)
        self.cell(30, 8, value, 1, 1, "C", True)
        self.ln(2)


def create_pdf_report(
    output_path: str, 
    data: Dict[str, Any], 
    include_comments: bool = True
) -> None:
    """
    Create a PDF report from feedback data
    
    Args:
        output_path: Path to save the PDF
        data: Report data
        include_comments: Whether to include comments
    """
    try:
        # Create PDF
        pdf = PDF(data["title"], orientation="P", unit="mm", format="A4")
        pdf.add_page()
        
        # Summary section
        pdf.chapter_title("Summary")
        
        # Add basic info
        pdf.section_title("Report Information")
        pdf.paragraph(f"Subject: {data['subject']['name']}")
        pdf.paragraph(f"Cycle: {data['cycle']['title']}")
        pdf.paragraph(f"Number of Evaluators: {data['feedback_count']}")
        pdf.paragraph(f"Generated: {data['generated_at']}")
        pdf.ln(5)
        
        # Add statistics boxes
        pdf.section_title("Feedback Statistics")
        
        # Find average rating
        avg_rating = None
        count = 0
        sum_ratings = 0
        
        for q_id, stats in data.get("stats", {}).items():
            if "average" in stats:
                sum_ratings += stats["average"]
                count += 1
        
        if count > 0:
            avg_rating = round(sum_ratings / count, 2)
        
        # Display stats
        if avg_rating:
            x = pdf.get_x()
            pdf.add_stat_box("Overall Average", f"{avg_rating:.1f}")
            pdf.set_x(x + 80)
            pdf.add_stat_box("Responses", str(data['feedback_count']))
            pdf.ln(10)
        else:
            pdf.add_stat_box("Responses", str(data['feedback_count']))
            pdf.ln(10)
        
        # Results by category
        categories = data.get("categories", {})
        
        for category_name, category_questions in categories.items():
            pdf.add_page()
            pdf.chapter_title(f"Category: {category_name}")
            
            for question in category_questions:
                q_id = question["id"]
                q_text = question["text"]
                q_type = question["type"]
                
                pdf.section_title(q_text)
                
                # Get responses for this question
                responses = data.get("responses", {}).get(q_id, [])
                stats = data.get("stats", {}).get(q_id, {})
                
                if q_type == "rating":
                    # Display rating stats
                    if "average" in stats:
                        pdf.paragraph(f"Average: {stats['average']:.1f}")
                        pdf.rating_bar(stats["average"])
                        pdf.paragraph(f"Median: {stats['median']:.1f}")
                        pdf.paragraph(f"Range: {stats['min']} - {stats['max']}")
                        pdf.ln(5)
                
                elif q_type == "multiplechoice":
                    # Display option counts
                    if "option_counts" in stats:
                        for option, count in stats["option_counts"].items():
                            option_label = option
                            for opt in question.get("options", []):
                                if str(opt["value"]) == str(option):
                                    option_label = opt["label"]
                                    break
                            
                            pdf.paragraph(f"{option_label}: {count} responses")
                        pdf.ln(5)
                
                # Display text responses
                if q_type in ["text", "textarea"]:
                    for i, response in enumerate(responses):
                        value = response.get("value", "")
                        if value:
                            evaluator = response.get("evaluator", {})
                            pdf.set_font("Arial", "I", 9)
                            pdf.set_text_color(100, 100, 100)
                            pdf.paragraph(f"Response {i+1}:")
                            
                            pdf.set_font("Arial", "", 10)
                            pdf.set_text_color(0, 0, 0)
                            pdf.paragraph(value)
                            pdf.ln(3)
                    pdf.ln(5)
                
                # Display comments if included
                if include_comments:
                    comments = [r.get("comment") for r in responses if r.get("comment")]
                    if comments:
                        pdf.section_title("Comments")
                        for comment in comments:
                            pdf.bullet_point(comment)
                        pdf.ln(5)
        
        # General comments
        if include_comments and data.get("comments"):
            pdf.add_page()
            pdf.chapter_title("General Comments")
            
            for comment_data in data["comments"]:
                evaluator = comment_data.get("evaluator", "Anonymous")
                comment = comment_data.get("comment", "")
                
                if comment:
                    pdf.set_font("Arial", "I", 9)
                    pdf.set_text_color(100, 100, 100)
                    pdf.paragraph(f"From: {evaluator}")
                    
                    pdf.set_font("Arial", "", 10)
                    pdf.set_text_color(0, 0, 0)
                    pdf.paragraph(comment)
                    pdf.ln(5)
        
        # Save the PDF
        pdf.output(output_path)
        logger.info(f"PDF report created at {output_path}")
    
    except Exception as e:
        logger.error(f"Error creating PDF report: {str(e)}")
        raise