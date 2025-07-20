import { util } from '../../common/util.js';
import { storage } from '../../common/storage.js';

export const card = (() => {

    const maxCommentLength = 300;

    /**
     * Menampilkan UI loading saat komentar sedang dimuat.
     */
    const renderLoading = () => {
        return `
        <div class="bg-theme-auto shadow p-3 mx-0 mt-0 mb-3 rounded-4">
            <div class="d-flex justify-content-between align-items-center placeholder-wave">
                <span class="placeholder bg-secondary col-5 rounded-3 my-1"></span>
                <span class="placeholder bg-secondary col-3 rounded-3 my-1"></span>
            </div>
            <hr class="my-1">
            <p class="placeholder-wave m-0">
                <span class="placeholder bg-secondary col-6 rounded-3"></span>
                <span class="placeholder bg-secondary col-5 rounded-3"></span>
                <span class="placeholder bg-secondary col-12 rounded-3 my-1"></span>
            </p>
        </div>`;
    };

    /**
     * Merender tombol Like.
     */
    const renderLike = (item) => {
        const likeCount = item.likes && item.likes.length > 0 ? item.likes[0].count : 0;
        // Note: Status isLiked akan diatur oleh like.js saat inisialisasi
        
        return `
        <button style="font-size: 0.8rem;" onclick="window.undangan.like.love(this)" data-id="${item.id}" class="btn btn-sm btn-outline-auto ms-auto rounded-3 p-0 shadow-sm d-flex justify-content-start align-items-center">
            <span class="my-0 mx-1" data-count-like="${likeCount}">${likeCount}</span>
            <i class="me-1 fa-regular fa-heart"></i>
        </button>`;
    };
    
    /**
     * Merender tombol Aksi (Reply, Edit, Delete).
     */
    const renderAction = (item, isParent) => {
        return `
        <div class="d-flex justify-content-start align-items-center" data-button-action="${item.id}">
            ${isParent ? `<button style="font-size: 0.8rem;" onclick="window.undangan.comment.reply(${item.id})" class="btn btn-sm btn-outline-auto rounded-4 py-0 me-1 shadow-sm">Reply</button>` : ''}
            <button style="font-size: 0.8rem;" onclick="window.undangan.comment.edit(${item.id}, ${!isParent})" class="btn btn-sm btn-outline-auto rounded-4 py-0 me-1 shadow-sm">Edit</button>
            <button style="font-size: 0.8rem;" onclick="window.undangan.comment.remove(${item.id}, ${!isParent})" class="btn btn-sm btn-outline-auto rounded-4 py-0 me-1 shadow-sm">Delete</button>
        </div>`;
    };
    
    /**
     * Merender tombol 'Lihat balasan'.
     */
    const renderReadMore = (item) => {
        if (!item.replies || item.replies.length === 0) return '';
        return `<a class="text-theme-auto" style="font-size: 0.8rem;" onclick="window.undangan.comment.showOrHide(this, ${item.id})" role="button">Lihat balasan (${item.replies.length})</a>`;
    };

    /**
     * Menggabungkan semua tombol untuk satu kartu komentar.
     */
    const renderButton = (item, isParent) => {
        return `
        <div class="d-flex justify-content-between align-items-center mt-2" id="button-${item.id}">
            ${renderAction(item, isParent)}
            ${isParent ? renderReadMore(item) : ''}
            ${renderLike(item)}
        </div>`;
    };
    
    /**
     * Merender judul kartu komentar.
     */
    const renderTitle = (item, isParent) => {
        const name = util.escapeHtml(item.name);
        if (isParent) {
            const isPresent = item.presence === 'Datang';
            const icon = isPresent ? 'fa-circle-check text-success' : 'fa-circle-xmark text-danger';
            return `<strong class="me-1">${name}</strong><i id="badge-${item.id}" class="fa-solid ${icon}"></i>`;
        }
        return `<strong>${name}</strong>`;
    };

    /**
     * Merender isi (body) dari kartu komentar.
     */
    const renderBody = (item, isParent) => {
        const commentText = util.escapeHtml(isParent ? item.comment : item.reply_text);
        const timeAgo = util.timeAgo ? util.timeAgo(new Date(item.created_at)) : 'baru saja';

        const head = `
        <div class="d-flex justify-content-between align-items-center">
            <p class="text-theme-auto text-truncate m-0 p-0" style="font-size: 0.95rem;">${renderTitle(item, isParent)}</p>
            <small class="text-theme-auto m-0 p-0" style="font-size: 0.75rem;">${timeAgo}</small>
        </div>
        <hr class="my-1">`;
        
        const content = `
        <p class="text-theme-auto my-1 mx-0 p-0" style="white-space: pre-wrap !important; font-size: 0.95rem;">${commentText}</p>`;
        
        return head + content;
    };
    
    /**
     * Merender satu kartu komentar lengkap, termasuk balasannya.
     */
    const renderContent = (item, isParent = true) => {
        const repliesHTML = isParent && item.replies && item.replies.length > 0
            ? `<div id="reply-content-${item.id}" style="display: none;">${item.replies.map(reply => renderContent(reply, false)).join('')}</div>`
            : '';

        const cardClass = isParent 
            ? 'bg-theme-auto shadow p-3 mx-0 mt-0 mb-3 rounded-4' 
            : 'overflow-x-scroll mw-100 border-start bg-theme-auto py-2 ps-2 pe-0 my-2 ms-2 me-0';
        
        return `
        <div class="${cardClass}" id="comment-card-${item.id}" style="overflow-wrap: break-word !important;">
            <div id="body-content-${item.id}" data-tapTime="0">${renderBody(item, isParent)}</div>
            ${renderButton(item, isParent)}
            ${repliesHTML}
        </div>`;
    };
    
    /**
     * Merender banyak kartu komentar dari sebuah array data.
     */
    const renderContentMany = (items) => {
        if (!Array.isArray(items)) {
            console.error('renderContentMany expects an array');
            return '';
        }
        return items.map(item => renderContent(item, true)).join('');
    };

    /**
     * Inisialisasi modul.
     */
    const init = () => {
        // Setup global namespace jika belum ada
        if (!window.undangan) {
            window.undangan = {};
        }
    };

    return {
        init,
        renderLoading,
        renderContentMany,
        renderContent,
        maxCommentLength,
    };
})();