#!/usr/bin/env python3
"""
Apex Institute LMS — Team Development & Simultaneous Collaboration Guide
Generates a publication-grade, beautifully formatted PDF manual.
"""

import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Top Running Header (Pages 2+)
        if self._pageNumber > 1:
            self.drawString(54, 11 * inch - 36, "Apex Institute LMS — Team Development & Collaboration Guide")
            self.drawRightString(8.5 * inch - 54, 11 * inch - 36, "https://github.com/SATHISH9042/ONLINE-COURSE")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 11 * inch - 42, 8.5 * inch - 54, 11 * inch - 42)

        # Bottom Running Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 46, 8.5 * inch - 54, 46)

        self.drawString(54, 32, "Confidential — For Apex Institute Development Team Only")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(8.5 * inch - 54, 32, page_str)
        self.restoreState()


def create_code_block(code_text, style):
    escaped = code_text.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('\n', '<br/>')
    p = Paragraph(f"<font face='Courier' size=8.5 color='#0F172A'>{escaped}</font>", style)
    t = Table([[p]], colWidths=[7.2 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 7),
        ('BOTTOMPADDING', (0,0), (-1,-1), 7),
        ('LEFTPADDING', (0,0), (-1,-1), 10),
        ('RIGHTPADDING', (0,0), (-1,-1), 10),
    ]))
    return t


def create_callout(title, body_text, title_style, body_style, border_color="#0284C7", bg_color="#F0F9FF"):
    p_title = Paragraph(f"<b>{title}</b>", title_style)
    p_body = Paragraph(body_text, body_style)
    t = Table([[p_title], [p_body]], colWidths=[7.2 * inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor(bg_color)),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor(border_color)),
        ('LINELEFT', (0,0), (-1,-1), 4, colors.HexColor(border_color)),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    return t


def build_pdf(filename):
    os.makedirs(os.path.dirname(filename), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=colors.HexColor('#0F172A'),
        spaceAfter=4
    )
    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        fontName='Helvetica',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor('#475569'),
        spaceAfter=12
    )
    h1_style = ParagraphStyle(
        'Heading1_Custom',
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=17,
        textColor=colors.HexColor('#0F172A'),
        spaceBefore=12,
        spaceAfter=6,
        keepWithNext=True
    )
    h2_style = ParagraphStyle(
        'Heading2_Custom',
        fontName='Helvetica-Bold',
        fontSize=10.5,
        leading=14,
        textColor=colors.HexColor('#1E293B'),
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )
    body_style = ParagraphStyle(
        'Body_Custom',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        spaceAfter=5
    )
    bullet_style = ParagraphStyle(
        'Bullet_Custom',
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor('#334155'),
        leftIndent=15,
        firstLineIndent=-10,
        spaceAfter=3
    )
    callout_title = ParagraphStyle(
        'CalloutTitle',
        fontName='Helvetica-Bold',
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor('#0369A1'),
        spaceAfter=2
    )
    callout_body = ParagraphStyle(
        'CalloutBody',
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor('#0F172A')
    )
    table_cell = ParagraphStyle(
        'TableCell',
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#1E293B')
    )
    table_header = ParagraphStyle(
        'TableHeader',
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white
    )

    story = []

    # Title & Header
    story.append(Paragraph("Apex Institute Learning Management Platform", title_style))
    story.append(Paragraph("Team Development & Simultaneous Collaboration Standard Operating Procedure (SOP)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284C7"), spaceBefore=0, spaceAfter=10))

    # Live Infrastructure Reference Box
    ref_table_data = [
        [Paragraph("Component", table_header), Paragraph("Live URL / Endpoint", table_header), Paragraph("Deployment Host & Environment", table_header)],
        [Paragraph("<b>Frontend Web Application</b>", table_cell), Paragraph("<font color='#0284C7'>https://sathish9042.github.io/ONLINE-COURSE/</font>", table_cell), Paragraph("GitHub Pages (Auto CI/CD on push to main)", table_cell)],
        [Paragraph("<b>Backend REST API</b>", table_cell), Paragraph("<font color='#0284C7'>https://online-course-47df.onrender.com</font>", table_cell), Paragraph("Render Free Web Service (Auto deploy from main)", table_cell)],
        [Paragraph("<b>PostgreSQL Database</b>", table_cell), Paragraph("Neon.tech Cloud Serverless PostgreSQL", table_cell), Paragraph("AWS Ohio (us-east-2) with SSL encryption", table_cell)],
        [Paragraph("<b>Git Code Repository</b>", table_cell), Paragraph("https://github.com/SATHISH9042/ONLINE-COURSE", table_cell), Paragraph("Branches: main (Production), gh-pages (Web)", table_cell)],
    ]
    ref_table = Table(ref_table_data, colWidths=[1.8 * inch, 3.2 * inch, 2.2 * inch])
    ref_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(ref_table)
    story.append(Spacer(1, 8))

    # Default Credentials Box
    story.append(Paragraph("<b>Default Pre-Seeded Test Credentials</b>", h2_style))
    cred_data = [
        [Paragraph("Role", table_header), Paragraph("Login Identifier", table_header), Paragraph("Password", table_header), Paragraph("Clearance & Portal Permissions", table_header)],
        [Paragraph("<b>Administrator</b>", table_cell), Paragraph("admin@institute.edu<br/>+919999999999", table_cell), Paragraph("Admin@123", table_cell), Paragraph("ACTIVE — Full Executive Console, Clearances, Curriculum", table_cell)],
        [Paragraph("<b>Active Student</b>", table_cell), Paragraph("priya.patel@example.com<br/>+919888877777", table_cell), Paragraph("Student@123", table_cell), Paragraph("ACTIVE — Video Player, Coding Sandbox, MCQ Assessments", table_cell)],
        [Paragraph("<b>Pending Student</b>", table_cell), Paragraph("+919876543210", table_cell), Paragraph("Student@123", table_cell), Paragraph("PENDING_APPROVAL — Restricted clearance lockout flow", table_cell)],
    ]
    cred_table = Table(cred_data, colWidths=[1.4 * inch, 2.0 * inch, 1.2 * inch, 2.6 * inch])
    cred_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#1E293B")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(cred_table)
    story.append(Spacer(1, 10))

    # Section 1: Initial Local Setup
    story.append(Paragraph("1. Initial Environment Setup (One-Time for Each Team Member)", h1_style))
    story.append(Paragraph("Each team member must set up their local workstation using the following commands:", body_style))

    code_setup = """# 1. Clone repository from GitHub
git clone https://github.com/SATHISH9042/ONLINE-COURSE.git
cd ONLINE-COURSE

# 2. Install backend and frontend dependencies
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. Initialize local embedded zero-config PostgreSQL database
npm --prefix backend run migrate
npm --prefix backend run seed"""
    story.append(create_code_block(code_setup, body_style))
    story.append(Spacer(1, 10))

    # Section 2: Local Development
    story.append(Paragraph("2. Daily Development Workflow (Single Developer)", h1_style))
    story.append(Paragraph("Always update your local code and create a dedicated branch before making modifications:", body_style))

    code_dev_start = """# Fetch latest main branch
git checkout main
git pull origin main

# Create a feature branch for your specific task
git checkout -b feature/your-task-name"""
    story.append(create_code_block(code_dev_start, body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("Run the development servers locally in two terminal windows:", body_style))
    code_servers = """# Terminal 1: Backend API Server (http://localhost:5001)
npm --prefix backend run dev

# Terminal 2: Frontend React Application (http://localhost:5173)
npm --prefix frontend run dev"""
    story.append(create_code_block(code_servers, body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Where to make modifications:</b>", h2_style))
    story.append(Paragraph("• <b>Frontend UI & Pages</b>: Located in <font face='Courier'>frontend/src/pages/</font> and <font face='Courier'>frontend/src/components/</font>. Changes reload instantly in the browser.", bullet_style))
    story.append(Paragraph("• <b>Backend Logic & APIs</b>: Located in <font face='Courier'>backend/src/routes/</font>, <font face='Courier'>backend/src/controllers/</font>, and <font face='Courier'>backend/src/validators/</font>.", bullet_style))
    story.append(Paragraph("• <b>Database Schema</b>: Update <font face='Courier'>backend/src/database/schema.sql</font>, then run <font face='Courier'>npm --prefix backend run migrate</font> to verify.", bullet_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Verification before pushing:</b>", h2_style))
    story.append(Paragraph("Always ensure all 118 automated tests pass and the frontend compiles cleanly:", body_style))
    code_test = """# 1. Run all 10 phases of automated tests (118 assertions)
npm --prefix backend test

# 2. Verify TypeScript frontend build
npm --prefix frontend run build"""
    story.append(create_code_block(code_test, body_style))
    story.append(Spacer(1, 10))

    # Page Break for Clean Multi-Person Section
    story.append(PageBreak())

    # Section 3: Simultaneous Multi-Developer Workflow
    story.append(Paragraph("3. Simultaneous Multi-Developer Collaboration (Person A & Person B)", h1_style))
    story.append(Paragraph("When two or more developers work on the repository at the same time, follow this strict procedure to guarantee zero code loss and zero merge conflicts.", body_style))
    story.append(Spacer(1, 4))

    callout_rules = """<b>Rule 1: NEVER commit directly to 'main'</b>. Main is connected to live production.<br/>
<b>Rule 2: Every feature gets its own branch</b> (e.g., <i>feature/person-a-task</i> and <i>feature/person-b-task</i>).<br/>
<b>Rule 3: Separate files & concerns</b>. Assign distinct features to avoid simultaneous edits to the same lines."""
    story.append(create_callout("The 3 Golden Rules of Parallel Work", callout_rules, callout_title, callout_body, border_color="#2563EB", bg_color="#EFF6FF"))
    story.append(Spacer(1, 10))

    story.append(Paragraph("<b>Chronological Walkthrough: Person A and Person B in Action</b>", h2_style))

    sim_steps = [
        [Paragraph("Step", table_header), Paragraph("Person A Action (e.g., Certificate Feature)", table_header), Paragraph("Person B Action (e.g., Profile Photo Upload)", table_header)],
        [
            Paragraph("<b>Step 1:<br/>Morning Sync</b>", table_cell),
            Paragraph("<font face='Courier'>git checkout main<br/>git pull origin main<br/>git checkout -b feature/certificate</font>", table_cell),
            Paragraph("<font face='Courier'>git checkout main<br/>git pull origin main<br/>git checkout -b feature/avatar-upload</font>", table_cell)
        ],
        [
            Paragraph("<b>Step 2:<br/>Local Work</b>", table_cell),
            Paragraph("Works in <font face='Courier'>frontend/src/pages/learning/</font><br/>Runs local servers; tests feature.", table_cell),
            Paragraph("Works in <font face='Courier'>frontend/src/pages/student/</font><br/>Runs local servers; tests feature.", table_cell)
        ],
        [
            Paragraph("<b>Step 3:<br/>Person A Finishes First</b>", table_cell),
            Paragraph("<font face='Courier'>git add .<br/>git commit -m \"feat: certificate\"<br/>git push -u origin feature/certificate</font><br/><b>Opens PR on GitHub & Merges into main.</b><br/><i>Render & GitHub Pages deploy automatically!</i>", table_cell),
            Paragraph("Continues developing on their local branch.<br/>(Person B's local code is completely unaffected by Person A's push).", table_cell)
        ],
        [
            Paragraph("<b>Step 4:<br/>Person B Syncs Latest main (CRITICAL)</b>", table_cell),
            Paragraph("Starts next task or reviews teammate's PR.", table_cell),
            Paragraph("Before finishing, Person B pulls Person A's new changes into their own working branch:<br/><font face='Courier'><b>git fetch origin<br/>git merge origin/main</b></font><br/><i>Person B now has both their code AND Person A's code!</i>", table_cell)
        ],
        [
            Paragraph("<b>Step 5:<br/>Person B Pushes & Merges</b>", table_cell),
            Paragraph("Reviews Person B's Pull Request.", table_cell),
            Paragraph("<font face='Courier'>npm --prefix backend test<br/>git add .<br/>git commit -m \"feat: avatar upload\"<br/>git push origin feature/avatar-upload</font><br/><b>Opens PR on GitHub & Merges into main.</b>", table_cell)
        ]
    ]
    sim_table = Table(sim_steps, colWidths=[1.1 * inch, 3.05 * inch, 3.05 * inch])
    sim_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(sim_table)
    story.append(Spacer(1, 10))

    # Section 4: Merge Conflicts
    story.append(Paragraph("4. How to Resolve Merge Conflicts (When Both Edit the Same File)", h1_style))
    story.append(Paragraph("If Person A and Person B modify the <b>exact same lines</b> in the same file, Git pauses during <font face='Courier'>git merge origin/main</font> and alerts you:", body_style))

    conflict_sample = """<<<<<<< HEAD (Current Change: Person B's code)
const apiBase = "https://online-course-47df.onrender.com/api/v1";
=======
const apiBase = process.env.VITE_API_URL || "https://online-course-47df.onrender.com/api/v1";
>>>>>>> origin/main (Incoming Change: Person A's code)"""
    story.append(create_code_block(conflict_sample, body_style))
    story.append(Spacer(1, 6))

    story.append(Paragraph("<b>Resolution Steps in Visual Studio Code:</b>", h2_style))
    story.append(Paragraph("1. Open the highlighted file in VS Code.", bullet_style))
    story.append(Paragraph("2. Above the conflict markers, click one of the interactive options:", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>Accept Current Change</b>: Keeps Person B's code.", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>Accept Incoming Change</b>: Keeps Person A's code from main.", bullet_style))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;• <b>Accept Both Changes</b>: Preserves both modifications sequentially.", bullet_style))
    story.append(Paragraph("3. Save the file and complete the merge commit:", bullet_style))

    code_conflict_commit = """git add .
git commit -m "merge: resolve conflicts with main"
git push origin feature/your-branch-name"""
    story.append(create_code_block(code_conflict_commit, body_style))
    story.append(Spacer(1, 10))

    # Section 5: Automated CI/CD
    story.append(Paragraph("5. Automated CI/CD Deployment Architecture", h1_style))
    story.append(Paragraph("When code is merged into <font face='Courier'>main</font>, two automated pipelines execute simultaneously:", body_style))

    deploy_data = [
        [Paragraph("Deployment Target", table_header), Paragraph("Trigger Condition", table_header), Paragraph("Automated Actions Performed", table_header)],
        [
            Paragraph("<b>Backend Web Service</b><br/>Render.com", table_cell),
            Paragraph("Any commit pushed to <font face='Courier'>main</font> touching <font face='Courier'>backend/</font>", table_cell),
            Paragraph("1. Installs Node.js dependencies<br/>2. Compiles TypeScript into <font face='Courier'>dist/</font><br/>3. Connects to Neon PostgreSQL<br/>4. Runs schema migrations and seeds<br/>5. Launches API on HTTPS port 443", table_cell)
        ],
        [
            Paragraph("<b>Frontend Web Application</b><br/>GitHub Pages", table_cell),
            Paragraph("Any commit pushed to <font face='Courier'>main</font>", table_cell),
            Paragraph("1. GitHub Actions workflow triggers (<font face='Courier'>deploy.yml</font>)<br/>2. Injects production backend URL<br/>3. Compiles production bundle with Vite<br/>4. Pushes static bundle to <font face='Courier'>gh-pages</font> branch<br/>5. Live site reflects changes in 60 seconds", table_cell)
        ]
    ]
    deploy_table = Table(deploy_data, colWidths=[1.8 * inch, 1.8 * inch, 3.6 * inch])
    deploy_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('GRID', (0,0), (-1,-1), 0.5, colors.HexColor("#CBD5E1")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
    ]))
    story.append(deploy_table)
    story.append(Spacer(1, 10))

    # Section 6: GitHub Kanban Board
    story.append(Paragraph("6. Team Task Tracking (GitHub Projects)", h1_style))
    story.append(Paragraph("To ensure team members never accidentally work on the same component at the same time:", body_style))
    story.append(Paragraph("• Open the Kanban board at: <b>https://github.com/SATHISH9042/ONLINE-COURSE/projects</b>", bullet_style))
    story.append(Paragraph("• Maintain three standard columns: <b>To Do</b>, <b>In Progress</b>, and <b>Done</b>.", bullet_style))
    story.append(Paragraph("• Assign tasks to specific developers before writing any code.", bullet_style))

    # Build document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[Success] PDF generated at: {filename}")


if __name__ == '__main__':
    target = sys.argv[1] if len(sys.argv) > 1 else 'docs/Team_Collaboration_and_Development_Guide.pdf'
    build_pdf(target)
