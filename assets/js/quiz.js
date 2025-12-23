/* ============================================
   Course Recommendation Quiz Logic
   ============================================ */

const quizData = [
    {
        question: "What excites you the most when you see a great website or app?",
        options: [
            { text: "The beautiful layout, colors, and how easy it is to use.", score: { design: 10, uiux: 10 } },
            { text: "The features like 'How does the login work?' or 'How is data stored?'", score: { development: 10, fullstack: 10 } },
            { text: "The speed and how it handles millions of users without crashing.", score: { cloud: 10, devops: 10 } },
            { text: "I care mostly about how clear the communication and instructions are.", score: { softskills: 10 } }
        ]
    },
    {
        question: "Which of these tools or activities sounds more interesting to you?",
        options: [
            { text: "Drawing, playing with fonts, and creating visual brands.", score: { design: 10 } },
            { text: "Solving puzzles and writing logic to make things happen.", score: { development: 10, dsa: 10 } },
            { text: "Managing servers, security, and complex IT systems.", score: { cloud: 10, aws: 10 } },
            { text: "Persuading people and improving communication style.", score: { softskills: 10 } }
        ]
    },
    {
        question: "How do you prefer to solve a problem?",
        options: [
            { text: "By visualizing it and creating a mock-up/prototype.", score: { uiux: 10, design: 5 } },
            { text: "By breaking it into logical steps and writing a sequence.", score: { fullstack: 10, python: 10 } },
            { text: "By looking at the infrastructure and optimizing performance.", score: { devops: 10, aws: 10 } },
            { text: "By talking it out and finding a diplomatic solution.", score: { softskills: 10 } }
        ]
    }
];

const courseRecommendations = {
    design: { title: "Graphic Design", icon: "fas fa-paint-brush", url: "pages/courses/graphic-design.html", desc: "Unleash your creativity and master branding with our Graphic Design excellence program." },
    uiux: { title: "UI/UX Design", icon: "fas fa-object-group", url: "pages/courses/ui-ux.html", desc: "Design interfaces that people love using Figma and modern design principles." },
    fullstack: { title: "Full Stack Development", icon: "fas fa-code", url: "pages/courses/full-stack.html", desc: "Become a complete developer by mastering frontend, backend, and databases." },
    devops: { title: "DevOps Engineering", icon: "fas fa-infinity", url: "pages/courses/devops.html", desc: "Bridge the gap between development and operations with automation and CI/CD." },
    aws: { title: "AWS Cloud Excellence", icon: "fab fa-aws", url: "pages/courses/aws.html", desc: "Master the world's leading cloud platform and build scalable infrastructure." },
    softskills: { title: "Spoken English Mastery", icon: "fas fa-comments", url: "pages/courses/spoken-english.html", desc: "Transform your personality and communication to excel in your professional career." },
    development: { title: "Python Full Stack", icon: "fab fa-python", url: "pages/courses/python.html", desc: "Learn the most versatile programming language and build powerful applications." }
};

let currentQuizStep = 0;
let userScores = {};

function initQuiz() {
    const quizTrigger = document.getElementById('startQuizBtn');
    if (quizTrigger) {
        quizTrigger.addEventListener('click', openQuizModal);
    }

    // Modal creation and injection
    if (!document.getElementById('quizModal')) {
        const modalHtml = `
            <div id="quizModal" class="quiz-modal">
                <div class="quiz-modal-content">
                    <button class="quiz-close" id="quizCloseBtn" aria-label="Close quiz">&times;</button>
                    <div id="quizBody">
                        <div class="quiz-intro">
                            <i class="fas fa-graduation-cap quiz-main-icon"></i>
                            <h2>Find Your Perfect Career Path</h2>
                            <p>Answer 3 quick questions and we'll recommend the best course for you!</p>
                            <button class="btn btn-primary" id="quizStartBtn">Get Started</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        injectQuizStyles();
        
        // Add event listeners instead of inline handlers
        const closeBtn = document.getElementById('quizCloseBtn');
        const startBtn = document.getElementById('quizStartBtn');
        const modal = document.getElementById('quizModal');
        
        if (closeBtn) {
            closeBtn.addEventListener('click', closeQuizModal);
        }
        
        if (startBtn) {
            startBtn.addEventListener('click', startQuiz);
        }
        
        // Close on background click
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeQuizModal();
                }
            });
        }
        
        // Close on ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape' && modal && modal.classList.contains('active')) {
                closeQuizModal();
            }
        });
    }
}

function openQuizModal() {
    document.getElementById('quizModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeQuizModal() {
    document.getElementById('quizModal').classList.remove('active');
    document.body.style.overflow = '';
    // Reset quiz for next time
    setTimeout(() => {
        currentQuizStep = 0;
        userScores = {};
        renderQuizIntro();
    }, 300);
}

function renderQuizIntro() {
    const quizBody = document.getElementById('quizBody');
    quizBody.innerHTML = `
        <div class="quiz-intro">
            <i class="fas fa-graduation-cap quiz-main-icon"></i>
            <h2>Find Your Perfect Career Path</h2>
            <p>Answer 3 quick questions and we'll recommend the best course for you!</p>
            <button class="btn btn-primary" onclick="startQuiz()">Get Started</button>
        </div>
    `;
}

function startQuiz() {
    currentQuizStep = 0;
    userScores = {};
    renderQuestion();
}

function renderQuestion() {
    const quizBody = document.getElementById('quizBody');
    const question = quizData[currentQuizStep];

    quizBody.innerHTML = `
        <div class="quiz-question-container">
            <div class="quiz-progress-bar">
                <div class="quiz-progress-fill" style="width: ${((currentQuizStep + 1) / quizData.length) * 100}%"></div>
            </div>
            <span class="quiz-step-indicator">Question ${currentQuizStep + 1} of ${quizData.length}</span>
            <h3>${question.question}</h3>
            <div class="quiz-options">
                ${question.options.map((opt, idx) => `
                    <button class="quiz-option" data-option-index="${idx}">
                        ${opt.text}
                    </button>
                `).join('')}
            </div>
        </div>
    `;
    
    // Add event listeners to options
    const options = quizBody.querySelectorAll('.quiz-option');
    options.forEach(option => {
        option.addEventListener('click', function() {
            const optionIdx = parseInt(this.getAttribute('data-option-index'));
            handleOptionSelect(optionIdx);
        });
    });
}

function handleOptionSelect(optionIdx) {
    const option = quizData[currentQuizStep].options[optionIdx];

    // Aggregate scores
    for (const [key, val] of Object.entries(option.score)) {
        userScores[key] = (userScores[key] || 0) + val;
    }

    currentQuizStep++;

    if (currentQuizStep < quizData.length) {
        renderQuestion();
    } else {
        renderResult();
    }
}

function renderResult() {
    const quizBody = document.getElementById('quizBody');

    // Find highest score
    let bestMatchKey = 'fullstack'; // Default
    let maxScore = -1;

    for (const [key, score] of Object.entries(userScores)) {
        if (score > maxScore) {
            maxScore = score;
            bestMatchKey = key;
        }
    }

    // Map specific scores to our course list if needed
    const recommendation = courseRecommendations[bestMatchKey] || courseRecommendations['fullstack'];

    quizBody.innerHTML = `
        <div class="quiz-result" style="animation: slideUp 0.5s ease-out;">
            <div class="result-badge">Perfect Match FOUND!</div>
            <div class="result-icon"><i class="${recommendation.icon}"></i></div>
            <h2>We Recommend: ${recommendation.title}</h2>
            <p>${recommendation.desc}</p>
            <div class="result-actions">
                <a href="${recommendation.url}" class="btn btn-primary">Course Details</a>
                <a href="https://wa.me/917842239090?text=I'd like to enroll in ${recommendation.title}!" target="_blank" class="btn btn-secondary">
                    <i class="fab fa-whatsapp"></i> I'd like to enroll
                </a>
            </div>
            <button class="quiz-restart" id="quizRestartBtn">Try Again</button>
        </div>
    `;
    
    // Add event listener for restart button
    const restartBtn = quizBody.querySelector('#quizRestartBtn');
    if (restartBtn) {
        restartBtn.addEventListener('click', startQuiz);
    }
}

function injectQuizStyles() {
    const sty = document.createElement('style');
    sty.textContent = `
        .quiz-modal {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(15, 23, 42, 0.9);
            backdrop-filter: blur(8px);
            display: flex; align-items: center; justify-content: center;
            z-index: 3000;
            opacity: 0; visibility: hidden;
            transition: all 0.3s ease;
        }
        .quiz-modal.active { opacity: 1; visibility: visible; }
        .quiz-modal-content {
            background: white;
            width: 90%; max-width: 500px;
            padding: 40px; border-radius: 24px;
            position: relative;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            text-align: center;
        }
        .quiz-close {
            position: absolute; top: 20px; right: 20px;
            background: none; border: none; font-size: 24px;
            cursor: pointer; color: #64748b;
        }
        .quiz-main-icon { font-size: 3rem; color: #6c5ce7; margin-bottom: 20px; }
        .quiz-intro h2 { margin-bottom: 12px; font-size: 1.75rem; color: #1e293b; }
        .quiz-intro p { color: #64748b; margin-bottom: 30px; }
        
        .quiz-progress-bar { width: 100%; height: 6px; background: #e2e8f0; border-radius: 3px; margin-bottom: 20px; overflow: hidden; }
        .quiz-progress-fill { height: 100%; background: #6c5ce7; transition: width 0.3s ease; }
        .quiz-step-indicator { display: block; font-size: 0.8rem; color: #64748b; margin-bottom: 8px; font-weight: 500; }
        
        .quiz-question-container h3 { margin-bottom: 24px; font-size: 1.4rem; color: #1e293b; line-height: 1.4; }
        .quiz-options { display: grid; gap: 12px; }
        .quiz-option {
            padding: 16px 20px; border: 2px solid #e2e8f0; border-radius: 12px;
            background: white; cursor: pointer; text-align: left;
            font-size: 1rem; color: #334155; font-weight: 500;
            transition: all 0.2s ease;
        }
        .quiz-option:hover { border-color: #6c5ce7; background: #f8fafc; transform: translateX(5px); }
        
        .quiz-result .result-badge { 
            display: inline-block; padding: 6px 16px; background: rgba(0, 184, 148, 0.1);
            color: #00b894; border-radius: 50px; font-weight: 700; font-size: 0.75rem;
            margin-bottom: 15px; letter-spacing: 1px;
        }
        .result-icon { font-size: 4rem; color: #6c5ce7; margin-bottom: 20px; }
        .quiz-result h2 { font-size: 1.8rem; margin-bottom: 15px; color: #1e293b; }
        .quiz-result p { color: #64748b; margin-bottom: 30px; line-height: 1.6; }
        .result-actions { display: flex; flex-direction: column; gap: 12px; margin-bottom: 25px; }
        .quiz-restart { background: none; border: none; color: #6c5ce7; text-decoration: underline; cursor: pointer; font-size: 0.9rem; }
        
        @keyframes slideUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    `;
    document.head.appendChild(sty);
}

document.addEventListener('DOMContentLoaded', initQuiz);
window.startQuiz = startQuiz;
window.handleOptionSelect = handleOptionSelect;
window.closeQuizModal = closeQuizModal;
window.openQuizModal = openQuizModal;
