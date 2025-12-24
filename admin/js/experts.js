// Experts Page Logic - Migrated to Supabase

let allExperts = [];

async function loadExperts() {
    try {
        const { data, error } = await supabase.from('experts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        allExperts = data;
        renderExperts();
    } catch (e) { showToast('Error loading experts', 'error'); }
}

function renderExperts() {
    const tbody = document.getElementById('expertsTable');
    if (!tbody) return;
    tbody.innerHTML = allExperts.map(e => `
        <tr>
            <td><strong>${e.name}</strong><br><small>${e.phone}</small></td>
            <td>${e.skills ? (Array.isArray(e.skills) ? e.skills.join(', ') : e.skills) : '-'}</td>
            <td>${e.experience || '0'} Yrs</td>
            <td><span class="status-badge ${e.status === 'active' ? 'paid' : 'pending'}">${(e.status || 'active').toUpperCase()}</span></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="deleteExpert('${e.id}')"><span class="material-icons">delete</span></button>
            </td>
        </tr>`).join('');
}

async function deleteExpert(id) {
    if (!await showConfirm({ title: 'Delete Expert?', type: 'danger' })) return;
    const { error } = await supabase.from('experts').delete().eq('id', id);
    if (!error) loadExperts();
}

window.deleteExpert = deleteExpert;
document.addEventListener('DOMContentLoaded', loadExperts);
