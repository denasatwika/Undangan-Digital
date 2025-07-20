// File: js/app/components/comment.js

import { supabase } from './supabaseClient.js';
import { util } from '../../common/util.js';
import { storage } from '../../common/storage.js';

export const comment = (() => {
    /** @type {HTMLFormElement|null} */
    let form = null;

    /** @type {HTMLButtonElement|null} */
    let button = null;

    /** @type {HTMLDivElement|null} */
    let list = null;

    const render = (comments) => {
        if (!list) return;
        list.innerHTML = ''; // Kosongkan daftar sebelum diisi

        if (comments.length === 0) {
            list.innerHTML = '<p class="text-center text-muted">Belum ada ucapan. Jadilah yang pertama!</p>';
            return;
        }

        comments.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('p-3', 'mb-3', 'border', 'rounded', 'bg-light');

            const presenceText = item.presence === '1' ? 'Akan Hadir' : 'Berhalangan';
            const presenceBadge = item.presence === '1' ? 'bg-success' : 'bg-secondary';

            const template = `
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <strong class="text-dark">${util.escapeHtml(item.name)}</strong>
                    <small class="badge ${presenceBadge}">${presenceText}</small>
                </div>
                <p class="mb-1 text-dark" style="word-wrap: break-word;">${util.escapeHtml(item.comment)}</p>
                <small class="text-muted fst-italic">${new Date(item.created_at).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })}</small>
            `;
            util.safeInnerHTML(div, template);
            list.appendChild(div);
        });
    };

    const show = async () => {
        if (!list) return;
        list.innerHTML = '<div class="text-center"><div class="spinner-border text-secondary" role="status"><span class="visually-hidden">Loading...</span></div></div>';

        try {
            const { data, error } = await supabase
                .from('comments')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            render(data);

        } catch (error) {
            console.error('Error fetching comments:', error);
            if (list) list.innerHTML = `<p class="text-center text-danger">Gagal memuat ucapan. Coba muat ulang halaman.</p>`;
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!form || !button) return;

        button.disabled = true;
        button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Mengirim...';

        const formData = new FormData(form);
        const name = formData.get('name');
        const commentText = formData.get('comment');
        const presence = formData.get('presence');

        try {
            const { error } = await supabase
                .from('comments')
                .insert([{ 
                    name: name, 
                    comment: commentText, 
                    presence: presence 
                }]);

            if (error) throw error;

            const information = storage('information');
            information.set('name', name);
            information.set('presence', presence);

            form.reset();
            document.getElementById('form-name').value = name; // Tetap isi nama setelah submit
            await show();

        } catch (error) {
            console.error('Error submitting comment:', error);
            alert('Gagal mengirim ucapan. Pastikan semua kolom terisi dan coba lagi.');
        } finally {
            button.disabled = false;
            button.innerHTML = 'Kirim Ucapan';
        }
    };

    const init = () => {
        form = document.getElementById('form');
        button = document.getElementById('form-button');
        list = document.getElementById('comment-list');

        if (form) {
            const information = storage('information');
            const nameInput = form.querySelector('#form-name');
            if (nameInput && information.has('name')) {
                nameInput.value = information.get('name');
            }
            form.addEventListener('submit', submit);
        }
    };

    return { init, show };
})();