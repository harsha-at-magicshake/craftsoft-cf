// Services Admin Logic - Migrated to Supabase

let allServices = [];

async function loadServices() {
    try {
        const { data, error } = await supabase
            .from('inquiries')
            .select('*')
            .eq('type', 'service')
            .order('created_at', { ascending: false });

        if (error) throw error;
        allServices = data;
        renderServices();
    } catch (e) { showToast('Error loading services', 'error'); }
}

function renderServices() {
    const tbody = document.getElementById('servicesTable');
    if (!tbody) return;
    tbody.innerHTML = allServices.map(s => `
        <tr>
            <td><strong>${s.name}</strong><br><small>${s.phone}</small></td>
            <td>${s.course || s.service || 'Service'}</td>
            <td><span class="status-badge">${(s.status || 'new').toUpperCase()}</span></td>
            <td>
                <button class="btn btn-outline btn-sm" onclick="deleteService('${s.id}')"><span class="material-icons">delete</span></button>
            </td>
        </tr>`).join('');
}

async function deleteService(id) {
    if (!confirm('Delete this request?')) return;
    const { error } = await supabase.from('inquiries').delete().eq('id', id);
    if (!error) loadServices();
}

window.deleteService = deleteService;
document.addEventListener('DOMContentLoaded', loadServices);
