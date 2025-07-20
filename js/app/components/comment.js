import { gif } from './gif.js';
import { card } from './card.js';
import { like } from './like.js';
import { util } from '../../common/util.js';
import { pagination } from './pagination.js';
import { lang } from '../../common/language.js';
import { storage } from '../../common/storage.js';
import { supabase } from './supabaseClient.js';

export const comment = (() => {
    let commentsContainer = null;

    /**
     * Menampilkan pesan jika tidak ada komentar.
     */
    const onNullComment = () => {
        const desc = lang
            .on('id', '📢 Jadilah yang pertama berkomentar!')
            .on('en', '📢 Be the first to comment!')
            .get();
        return `<div class="text-center p-4 mx-0 mt-0 mb-3 bg-theme-auto rounded-4 shadow"><p class="fw-bold p-0 m-0" style="font-size: 0.95rem;">${desc}</p></div>`;
    };

    /**
     * Memuat dan menampilkan semua komentar, balasan, dan suka dari Supabase.
     */
    const show = async () => {
        if (!commentsContainer || commentsContainer.getAttribute('data-loading') === 'true') return;
        commentsContainer.setAttribute('data-loading', 'true');
        commentsContainer.innerHTML = card.renderLoading();

        try {
            // Get pagination parameters
            const offset = pagination.getOffset();
            const limit = pagination.getPer();

            // First, get total count for pagination
            const { count, error: countError } = await supabase
                .from('comments')
                .select('*', { count: 'exact', head: true });

            if (countError) {
                throw countError;
            }

            // Set total for pagination
            pagination.setTotal(count || 0);

            // Ambil data komentar dengan pagination
            const { data: comments, error: commentsError } = await supabase
                .from('comments')
                .select(`
                    id,
                    name,
                    comment,
                    presence,
                    created_at,
                    uuid
                `)
                .order('created_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (commentsError) {
                throw commentsError;
            }

            // Ambil semua replies untuk comments ini
            const commentIds = comments.map(c => c.id);
            const { data: replies, error: repliesError } = await supabase
                .from('replies')
                .select(`
                    id,
                    name,
                    reply_text,
                    comment_id,
                    created_at,
                    uuid
                `)
                .in('comment_id', commentIds)
                .order('created_at', { ascending: true });

            if (repliesError) {
                throw repliesError;
            }

            // Ambil likes count untuk comments dan replies
            const allIds = [...commentIds, ...(replies?.map(r => r.id) || [])];
            const { data: likesData, error: likesError } = await supabase
                .from('likes')
                .select('comment_id')
                .in('comment_id', allIds);

            if (likesError) {
                throw likesError;
            }

            // Group likes by comment_id
            const likesCount = {};
            if (likesData) {
                likesData.forEach(like => {
                    likesCount[like.comment_id] = (likesCount[like.comment_id] || 0) + 1;
                });
            }

            // Combine data
            const processedComments = comments.map(comment => {
                const commentReplies = replies?.filter(r => r.comment_id === comment.id) || [];
                
                // Add likes count to comment and replies
                comment.likes = [{ count: likesCount[comment.id] || 0 }];
                commentReplies.forEach(reply => {
                    reply.likes = [{ count: likesCount[reply.id] || 0 }];
                });

                return {
                    ...comment,
                    replies: commentReplies
                };
            });

            commentsContainer.setAttribute('data-loading', 'false');

            if (processedComments.length === 0) {
                commentsContainer.innerHTML = onNullComment();
                return;
            }

            // Render content
            util.safeInnerHTML(commentsContainer, card.renderContentMany(processedComments));

            // Add like listeners
            const allItems = processedComments.flatMap(c => [c, ...(c.replies || [])]);
            allItems.forEach(item => {
                if (item.id) {
                    like.addListener(item.id);
                }
            });

            commentsContainer.dispatchEvent(new Event('undangan.comment.done'));
            
        } catch (error) {
            console.error('Error fetching comments:', error);
            commentsContainer.innerHTML = '<p class="text-center text-danger">Gagal memuat komentar.</p>';
            commentsContainer.dispatchEvent(new Event('undangan.comment.done'));
        } finally {
            commentsContainer.setAttribute('data-loading', 'false');
        }
    };

    /**
     * Mengirim komentar atau balasan baru ke Supabase.
     */
    const send = async (button, parentId = null) => {
        const isReply = parentId !== null;
        const formId = isReply ? `inner-${parentId}` : 'comment';
        
        const nameInput = document.getElementById(isReply ? `form-inner-name-${parentId}` : 'form-name');
        const commentInput = document.getElementById(isReply ? `form-inner-${formId}` : 'form-comment');
        const presenceInput = document.getElementById('form-presence');

        if (!nameInput || !commentInput) {
            return util.notify('Form tidak ditemukan.').error();
        }

        const name = nameInput.value.trim();
        const comment = commentInput.value.trim();
        
        if (!name) {
            return util.notify('Nama tidak boleh kosong.').warning();
        }
        if (!comment) {
            return util.notify('Komentar tidak boleh kosong.').warning();
        }

        const btn = util.disableButton(button);
        
        try {
            let result;
            if (isReply) {
                result = await supabase
                    .from('replies')
                    .insert([{ 
                        name: name, 
                        reply_text: comment, 
                        comment_id: parentId,
                        uuid: util.randomString(32) // Generate UUID jika diperlukan
                    }]);
            } else {
                if (!presenceInput) {
                    btn.restore();
                    return util.notify('Form kehadiran tidak ditemukan.').error();
                }
                
                const presence = presenceInput.value;
                if (presence === '0') {
                    btn.restore();
                    return util.notify('Silakan pilih status kehadiran Anda.').warning();
                }
                
                result = await supabase
                    .from('comments')
                    .insert([{ 
                        name: name, 
                        presence: presence, 
                        comment: comment,
                        uuid: util.randomString(32) // Generate UUID jika diperlukan
                    }]);
            }

            if (result.error) {
                throw result.error;
            }

            util.notify('Komentar berhasil dikirim!').success();
            commentInput.value = '';
            await show();
            
        } catch (error) {
            console.error('Error sending data:', error);
            util.notify('Gagal mengirim. Silakan coba lagi.').error();
        } finally {
            btn.restore();
        }
    };
    
    /**
     * Menghapus komentar atau balasan.
     */
    const remove = async (id, isReply = false) => {
        if (!util.ask('Anda yakin ingin menghapus ini?')) return;

        try {
            const tableName = isReply ? 'replies' : 'comments';
            const { error } = await supabase
                .from(tableName)
                .delete()
                .eq('id', id);

            if (error) {
                throw error;
            }

            util.notify('Berhasil dihapus.').success();
            const element = document.getElementById(`comment-card-${id}`);
            if (element) {
                element.remove();
            }
            
        } catch (error) {
            console.error('Error deleting item:', error);
            util.notify('Gagal menghapus.').error();
        }
    };
    
    /**
     * Menampilkan/menyembunyikan balasan
     */
    const showOrHide = (button, commentId) => {
        const replyContainer = document.getElementById(`reply-content-${commentId}`);
        if (!replyContainer) return;

        const isHidden = replyContainer.style.display === 'none';
        replyContainer.style.display = isHidden ? 'block' : 'none';
        
        const replyCount = replyContainer.children.length;
        button.textContent = isHidden 
            ? `Sembunyikan balasan (${replyCount})` 
            : `Lihat balasan (${replyCount})`;
    };

    const reply = (commentId) => {
        console.log(`UI for replying to comment ${commentId} should be shown here.`);
        // Implementasi UI untuk form reply
    };
    
    const edit = (id, isReply = false) => {
        console.log(`UI for editing item ${id} (isReply: ${isReply}) should be shown here.`);
        // Implementasi UI untuk form edit
    };

    /**
     * Inisialisasi modul komentar.
     */
    const init = () => {
        commentsContainer = document.getElementById('comments');
        
        // Setup global namespace
        if (!window.undangan) {
            window.undangan = {};
        }
        window.undangan.comment = {
            send,
            remove,
            edit,
            reply,
            show,
            showOrHide,
            pagination: pagination // Expose pagination
        };
        
        if (commentsContainer) {
            show();
        }
    };

    return {
        init,
        send,
        remove,
        edit,
        reply,
        show,
        showOrHide
    };
})();