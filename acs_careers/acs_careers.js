// Careers Page Interactivity
document.addEventListener('mousemove', (e) => {
    const blob1 = document.getElementById('blob1');
    const blob2 = document.getElementById('blob2');

    if (blob1 && blob2) {
        const x = e.clientX / window.innerWidth;
        const y = e.clientY / window.innerHeight;

        blob1.style.transform = `translate(${x * 50}px, ${y * 50}px)`;
        blob2.style.transform = `translate(${-x * 30}px, ${-y * 30}px)`;
    }
});

// Future: This script can be extended to fetch jobs from Supabase
/*
async function loadJobs() {
    const { data: jobs } = await supabase.from('job_openings').select('*').eq('active', true);
    if (jobs && jobs.length > 0) {
        // Replace empty state with job cards
    }
}
*/
console.log("Careers portal initialized.");
