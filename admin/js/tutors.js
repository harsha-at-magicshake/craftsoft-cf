// Tutors Page Logic - Migrated to Supabase

let allTutors = [];

// Load Tutors
async function loadTutors() {
    try {
        if (typeof showTableSkeleton === 'function') showTableSkeleton('tutorsTable', 5, 6);
        const { data, error } = await supabase.from('tutors').select('*').order('name');
        if (error) throw error;
        allTutors = data;
        renderTutors(allTutors);
    } catch (e) { showToast('Error loading tutors', 'error'); }
}

function renderTutors(tutors) {
    const tbody = document.getElementById('tutorsTable');
    if (!tbody) return;
    tbody.innerHTML = tutors.map(t => `
        <tr>
            <td><strong>${t.name}</strong><br><small>${t.phone}</small></td>
            <td>${t.subject || '-'}</td>
            <td>${t.mode || '-'}</td>
            <td><span class="status-badge ${t.status === 'active' ? 'paid' : 'pending'}">${(t.status || 'active').toUpperCase()}</span></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="deleteTutor('${t.id}')"><span class="material-icons">delete</span></button>
            </td>
        </tr>`).join('');
}

async function deleteTutor(id) {
    if (!await showConfirm({ title: 'Delete Tutor?', type: 'danger' })) return;
    const { error } = await supabase.from('tutors').delete().eq('id', id);
    if (!error) loadTutors();
}

window.deleteTutor = deleteTutor;
document.addEventListener('DOMContentLoaded', loadTutors);
