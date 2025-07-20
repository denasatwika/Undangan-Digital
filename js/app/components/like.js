import { supabase } from './supabaseClient.js'; // Pastikan path ini benar
import { util } from '../../common/util.js';
import { tapTapAnimation } from '../../libs/confetti.js';

export const like = (() => {

    let userIdentifier = null;
    let userLikes = new Set();

    /**
     * Membuat atau mendapatkan ID unik untuk pengguna dari local storage.
     */
    const getOrSetUserIdentifier = () => {
        const USER_ID_KEY = 'supabase-user-id';
        let id = localStorage.getItem(USER_ID_KEY);
        if (!id) {
            id = util.randomString ? util.randomString(32) : Math.random().toString(36).substr(2, 32);
            localStorage.setItem(USER_ID_KEY, id);
        }
        return id;
    };
    
    /**
     * Memuat semua 'suka' dari pengguna saat ini untuk caching.
     */
    const fetchUserLikes = async () => {
        if (!userIdentifier) return;
        
        try {
            const { data, error } = await supabase
                .from('likes')
                .select('comment_id')
                .eq('user_identifier', userIdentifier);
                
            if (!error && data) {
                userLikes = new Set(data.map(like => like.comment_id));
                // Update UI berdasarkan likes yang sudah ada
                updateLikeUI();
            }
        } catch (error) {
            console.error('Error fetching user likes:', error);
        }
    };

    /**
     * Update UI tombol like berdasarkan status suka pengguna
     */
    const updateLikeUI = () => {
        userLikes.forEach(commentId => {
            const button = document.querySelector(`button[data-id="${commentId}"]`);
            if (button) {
                const heart = button.lastElementChild;
                if (heart) {
                    heart.classList.replace('fa-regular', 'fa-solid');
                    heart.classList.add('text-danger');
                }
            }
        });
    };

    /**
     * Fungsi utama untuk menangani aksi 'suka' atau 'tidak suka'.
     */
    const love = async (button) => {
        if (!userIdentifier) {
            console.error('User identifier not initialized');
            return;
        }

        const info = button.firstElementChild;
        const heart = button.lastElementChild;
        const commentId = parseInt(button.getAttribute('data-id'));
        
        if (isNaN(commentId)) {
            console.error('Invalid comment ID');
            return;
        }

        let count = parseInt(info.getAttribute('data-count-like')) || 0;

        button.disabled = true;
        if (navigator.vibrate) navigator.vibrate(50);
        
        const hasLiked = userLikes.has(commentId);

        try {
            if (hasLiked) {
                // Proses 'Unlike'
                const { error } = await supabase
                    .from('likes')
                    .delete()
                    .match({ comment_id: commentId, user_identifier: userIdentifier });

                if (!error) {
                    userLikes.delete(commentId);
                    heart.classList.replace('fa-solid', 'fa-regular');
                    heart.classList.remove('text-danger');
                    count = Math.max(0, count - 1);
                } else {
                    throw error;
                }
            } else {
                // Proses 'Like'
                const { error } = await supabase
                    .from('likes')
                    .insert([{ comment_id: commentId, user_identifier: userIdentifier }]);

                if (!error) {
                    userLikes.add(commentId);
                    heart.classList.replace('fa-regular', 'fa-solid');
                    heart.classList.add('text-danger');
                    
                    // Trigger confetti animation
                    if (tapTapAnimation && typeof tapTapAnimation === 'function') {
                        tapTapAnimation(button.closest('.d-flex'));
                    }
                    
                    count++;
                } else {
                    throw error;
                }
            }
            
            info.textContent = count;
            info.setAttribute('data-count-like', String(count));
            
        } catch (error) {
            console.error('Error processing like/unlike:', error);
            // Kembalikan UI ke state sebelumnya jika terjadi error
            if (util.notify) {
                util.notify('Gagal memproses like. Silakan coba lagi.').error();
            }
        } finally {
            button.disabled = false;
        }
    };
    
    /**
     * Fungsi untuk menangani aksi tap-tap (ketuk dua kali).
     */
    const tapTap = async (div) => {
        const currentTime = Date.now();
        const lastTapTime = parseInt(div.getAttribute('data-tapTime') || '0');
        const tapLength = currentTime - lastTapTime;
        
        // Extract comment ID dari element ID
        const commentId = parseInt(div.id.replace('body-content-', ''));
        
        if (isNaN(commentId)) {
            console.error('Invalid comment ID from element:', div.id);
            div.setAttribute('data-tapTime', String(currentTime));
            return;
        }

        const isTapTap = tapLength < 300 && tapLength > 0;
        const notLiked = !userLikes.has(commentId);

        if (isTapTap && notLiked) {
            const likeButton = document.querySelector(`button[data-id="${commentId}"]`);
            if (likeButton) {
                await love(likeButton);
            }
        }
        
        div.setAttribute('data-tapTime', String(currentTime));
    };
    
    /**
     * Menambahkan event listener untuk tap-tap.
     */
    const addListener = (commentId) => {
        const bodyLike = document.getElementById(`body-content-${commentId}`);
        if (bodyLike) {
            // Remove existing listener to prevent duplicates
            bodyLike.removeEventListener('touchend', bodyLike._tapTapHandler);
            
            // Create new handler and store reference
            bodyLike._tapTapHandler = () => tapTap(bodyLike);
            bodyLike.addEventListener('touchend', bodyLike._tapTapHandler);
        }
    };
    
    /**
     * Inisialisasi modul like.
     */
    const init = async () => {
        try {
            userIdentifier = getOrSetUserIdentifier();
            await fetchUserLikes();
            
            // Setup global namespace
            if (!window.undangan) {
                window.undangan = {};
            }
            window.undangan.like = { love };
            
        } catch (error) {
            console.error('Error initializing like module:', error);
        }
    };

    return {
        init,
        love,
        addListener,
        fetchUserLikes,
        updateLikeUI
    };
})();