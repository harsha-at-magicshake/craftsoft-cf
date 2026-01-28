document.addEventListener('DOMContentLoaded', function() {
  fetch('assets/components/faq/faq.json')
    .then(response => response.json())
    .then(faqs => {
      const container = document.getElementById('faq-container');
      if (!container) return;
      faqs.forEach(faq => {
        const item = document.createElement('div');
        item.className = 'faq-item';
        item.innerHTML = `
          <button class="faq-question"><span>${faq.question}</span><i class="fas fa-chevron-down"></i></button>
          <div class="faq-answer"><p>${faq.answer}</p></div>
        `;
        container.appendChild(item);
      });
      // Toggle answer display
      container.querySelectorAll('.faq-question').forEach(btn => {
        btn.addEventListener('click', function() {
          const item = btn.parentElement;
          item.classList.toggle('active');
        });
      });
    });
});
