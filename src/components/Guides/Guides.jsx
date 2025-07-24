import React, {useState, useEffect} from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import {supabase} from '../../lib/supabase';
import {useDropzone} from 'react-dropzone';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const {FiBook, FiPlus, FiTrash2, FiUser, FiCalendar, FiImage, FiEdit3, FiSave, FiX, FiRefreshCw} = FiIcons;

const Guides = () => {
  const {user} = useAuth();
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState({
    title: '',
    content: '',
    image: null
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingPost, setEditingPost] = useState(null);

  // 🔄 IMPROVED SYNC - Better mobile support
  const loadGuides = async (showToast = false) => {
    try {
      if (showToast) setSyncing(true);
      console.log('📡 Loading guides from Supabase...');

      // Try Supabase first
      const {data: supabaseGuides, error} = await supabase
        .from('blog_posts_sommerhus_2024')
        .select('*')
        .order('created_at', {ascending: false});

      if (!error && supabaseGuides) {
        // Convert Supabase format to local format
        const convertedGuides = supabaseGuides.map(guide => ({
          id: guide.id,
          title: guide.title,
          content: guide.content,
          image: guide.image_url,
          author: guide.author_name,
          authorId: guide.author_id,
          date: guide.created_at
        }));

        setPosts(convertedGuides);
        // Backup to localStorage
        localStorage.setItem('sommerhus_guides_posts', JSON.stringify(convertedGuides));
        console.log('✅ Loaded guides from Supabase:', convertedGuides.length);
        
        if (showToast) {
          toast.success(`✅ ${convertedGuides.length} guides synkroniseret`);
        }
      } else {
        console.log('⚠️ Supabase failed, using localStorage:', error?.message);
        // Fallback to localStorage
        const storedPosts = JSON.parse(localStorage.getItem('sommerhus_guides_posts') || '[]');
        setPosts(storedPosts);
        
        if (showToast) {
          toast.info('Bruger lokal data som backup');
        }
      }
    } catch (error) {
      console.error('❌ Load guides error:', error);
      // Fallback to localStorage
      const storedPosts = JSON.parse(localStorage.getItem('sommerhus_guides_posts') || '[]');
      setPosts(storedPosts);
      
      if (showToast) {
        toast.error('Fejl ved synkronisering - bruger lokal data');
      }
    } finally {
      if (showToast) setSyncing(false);
    }
  };

  // Enhanced setup with better mobile support
  useEffect(() => {
    console.log('🚀 Setting up guides with enhanced mobile support...');
    
    // Initial load
    loadGuides();

    // Enhanced real-time subscription with error handling
    const channel = supabase
      .channel('guides-realtime-enhanced')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'blog_posts_sommerhus_2024'
      }, (payload) => {
        console.log('📡 Real-time guide update:', payload.eventType);
        // Delay to ensure consistency across devices
        setTimeout(() => loadGuides(), 1000);
      })
      .subscribe((status) => {
        console.log('📡 Real-time subscription status:', status);
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time connected successfully');
        } else if (status === 'CHANNEL_ERROR') {
          console.log('⚠️ Real-time connection failed - using polling');
        }
      });

    // Cross-tab sync for better mobile support
    const handleStorageChange = (e) => {
      if (e.key === 'sommerhus_guides_posts') {
        console.log('📱 Cross-tab sync detected');
        loadGuides();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Enhanced polling for mobile devices (every 15 seconds)
    const syncInterval = setInterval(() => {
      console.log('📱 Mobile-friendly periodic sync...');
      loadGuides();
    }, 15000);

    // Visibility change listener for mobile
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('📱 App became visible - syncing guides');
        loadGuides();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      channel.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(syncInterval);
    };
  }, []);

  const modules = {
    toolbar: [
      [{'header': [1, 2, false]}],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link', 'code-block'],
      ['clean']
    ],
  };

  const formats = [
    'header', 'bold', 'italic', 'underline', 'strike', 'blockquote',
    'list', 'bullet', 'indent', 'link', 'code-block'
  ];

  const onDrop = (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('Billedet er for stort. Maksimum 10MB.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Kun billeder er tilladt.');
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        setNewPost({...newPost, image: e.target.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const {getRootProps, getInputProps, isDragActive} = useDropzone({
    onDrop,
    accept: {'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']},
    maxSize: 10 * 1024 * 1024, // 10MB
    multiple: false
  });

  // Enhanced save with better error handling
  const saveGuide = async (guideData) => {
    try {
      // Save to localStorage immediately
      const updatedPosts = [guideData, ...posts];
      setPosts(updatedPosts);
      localStorage.setItem('sommerhus_guides_posts', JSON.stringify(updatedPosts));

      // Try to save to Supabase
      const supabaseData = {
        id: guideData.id,
        title: guideData.title,
        content: guideData.content,
        image_url: guideData.image,
        author_name: guideData.author,
        author_id: guideData.authorId,
        created_at: guideData.date
      };

      const {error} = await supabase
        .from('blog_posts_sommerhus_2024')
        .insert([supabaseData]);

      if (error) {
        console.log('⚠️ Supabase save failed (but saved locally):', error.message);
        toast.success('Guide gemt lokalt');
      } else {
        console.log('✅ Saved to both localStorage and Supabase');
        toast.success('Guide oprettet!');
      }

      // Trigger cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sommerhus_guides_posts',
        newValue: JSON.stringify(updatedPosts)
      }));

    } catch (error) {
      console.error('Save guide error:', error);
      toast.error('Fejl ved gemning af guide');
    }
  };

  // Enhanced update with better error handling
  const updateGuide = async (guideData) => {
    try {
      // Update localStorage immediately
      const updatedPosts = posts.map(post =>
        post.id === guideData.id ? guideData : post
      );
      setPosts(updatedPosts);
      localStorage.setItem('sommerhus_guides_posts', JSON.stringify(updatedPosts));

      // Try to update in Supabase
      const supabaseData = {
        title: guideData.title,
        content: guideData.content,
        image_url: guideData.image,
        author_name: guideData.author,
        author_id: guideData.authorId
      };

      const {error} = await supabase
        .from('blog_posts_sommerhus_2024')
        .update(supabaseData)
        .eq('id', guideData.id);

      if (error) {
        console.log('⚠️ Supabase update failed (but saved locally):', error.message);
        toast.success('Guide opdateret lokalt');
      } else {
        console.log('✅ Updated in both localStorage and Supabase');
        toast.success('Guide opdateret!');
      }

      // Trigger cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sommerhus_guides_posts',
        newValue: JSON.stringify(updatedPosts)
      }));

    } catch (error) {
      console.error('Update guide error:', error);
      toast.error('Fejl ved opdatering af guide');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newPost.title.trim() && newPost.content.trim()) {
      if (editingPost) {
        // Update existing post
        const updatedPost = {
          ...editingPost,
          title: newPost.title,
          content: newPost.content,
          image: newPost.image || editingPost.image
        };
        updateGuide(updatedPost);
        setEditingPost(null);
      } else {
        // Create new post
        const post = {
          id: Date.now(),
          title: newPost.title,
          content: newPost.content,
          image: newPost.image,
          author: user.fullName,
          authorId: user.id,
          date: new Date().toISOString(),
        };
        saveGuide(post);
      }

      setNewPost({title: '', content: '', image: null});
      setShowForm(false);
    }
  };

  const startEdit = (post) => {
    // Check if user can edit this post
    if (post.authorId !== user.id && !user?.isSuperUser) {
      toast.error('Du kan kun redigere dine egne guides');
      return;
    }

    setEditingPost(post);
    setNewPost({
      title: post.title,
      content: post.content,
      image: post.image
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setEditingPost(null);
    setNewPost({title: '', content: '', image: null});
    setShowForm(false);
  };

  const deletePost = async (id) => {
    try {
      // Only allow users to delete their own posts (or superusers to delete any)
      const post = posts.find(p => p.id === id);
      if (post.authorId !== user.id && !user?.isSuperUser) {
        toast.error('Du kan kun slette dine egne guides');
        return;
      }

      // Remove from localStorage
      const updatedPosts = posts.filter(post => post.id !== id);
      setPosts(updatedPosts);
      localStorage.setItem('sommerhus_guides_posts', JSON.stringify(updatedPosts));

      // Try to delete from Supabase
      try {
        const {error} = await supabase
          .from('blog_posts_sommerhus_2024')
          .delete()
          .eq('id', id);

        if (error) {
          console.log('⚠️ Supabase delete failed (but removed locally):', error.message);
        }
      } catch (supabaseError) {
        console.log('⚠️ Supabase delete error:', supabaseError.message);
      }

      toast.success('Guide slettet');

      // Trigger cross-tab sync
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'sommerhus_guides_posts',
        newValue: JSON.stringify(updatedPosts)
      }));

    } catch (error) {
      console.error('Delete guide error:', error);
      toast.error('Fejl ved sletning af guide');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const backgroundImages = JSON.parse(localStorage.getItem('sommerhus_background_images') || '{}');
  const backgroundImage = backgroundImages.guides;

  return (
    <div className={`max-w-4xl mx-auto ${backgroundImage ? 'bg-white/95 backdrop-blur-sm rounded-2xl p-4' : ''}`} style={backgroundImage ? {backgroundImage: `url(${backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center'} : {}}>
      <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-2xl shadow-lg p-6 mb-6`}>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-ebeltoft-dark flex items-center gap-2">
              <SafeIcon icon={FiBook} className="w-7 h-7" />
              Guides
            </h2>
            <p className="text-gray-600 mt-1">
              Instruktioner og guides til sommerhuset
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadGuides(true)}
              disabled={syncing}
              className="px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <SafeIcon icon={FiRefreshCw} className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{syncing ? 'Synkroniserer...' : 'Genindlæs'}</span>
            </button>
            <motion.button
              onClick={() => setShowForm(!showForm)}
              className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
              whileHover={{scale: 1.05}}
              whileTap={{scale: 0.95}}
            >
              <SafeIcon icon={FiPlus} className="w-5 h-5" />
              {editingPost ? 'Rediger guide' : 'Ny guide'}
            </motion.button>
          </div>
        </div>

        {showForm && (
          <motion.form
            initial={{opacity: 0, height: 0}}
            animate={{opacity: 1, height: 'auto'}}
            exit={{opacity: 0, height: 0}}
            onSubmit={handleSubmit}
            className="bg-ebeltoft-light rounded-xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">
              {editingPost ? 'Rediger guide' : 'Opret ny guide'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e) => setNewPost({...newPost, title: e.target.value})}
                  placeholder="f.eks. Nedlukning for vinteren, Sådan starter du huset op..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-ebeltoft-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Indhold</label>
                <div className="border border-gray-300 rounded-lg overflow-hidden">
                  <ReactQuill
                    theme="snow"
                    value={newPost.content}
                    onChange={(content) => setNewPost({...newPost, content})}
                    modules={modules}
                    formats={formats}
                    placeholder="Beskriv proceduren step-by-step..."
                    className="bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Billede (valgfrit)</label>
                <div
                  {...getRootProps()}
                  className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                    isDragActive ? 'border-ebeltoft-blue bg-blue-50' : 'border-gray-300 hover:border-ebeltoft-blue'
                  }`}
                >
                  <input {...getInputProps()} />
                  {newPost.image ? (
                    <div className="space-y-2">
                      <img src={newPost.image} alt="Preview" className="max-h-32 mx-auto rounded" />
                      <p className="text-sm text-green-600">Billede uploadet</p>
                    </div>
                  ) : (
                    <>
                      <SafeIcon icon={FiImage} className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        {isDragActive ? 'Slip billedet her...' : 'Træk og slip billede her, eller klik for at vælge'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF, WebP (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
              >
                <SafeIcon icon={editingPost ? FiSave : FiPlus} className="w-4 h-4" />
                {editingPost ? 'Gem ændringer' : 'Gem guide'}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
              >
                <SafeIcon icon={FiX} className="w-4 h-4" />
                Annuller
              </button>
            </div>
          </motion.form>
        )}
      </div>

      {loading && posts.length === 0 ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ebeltoft-blue mx-auto mb-4"></div>
          <p className="text-gray-600">Indlæser guides...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.length === 0 ? (
            <div className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-xl shadow-md p-8 text-center`}>
              <SafeIcon icon={FiBook} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-800 mb-2">Ingen guides endnu</h3>
              <p className="text-gray-600">Opret den første guide til sommerhuset.</p>
            </div>
          ) : (
            posts.map((post) => (
              <motion.article
                key={post.id}
                initial={{opacity: 0, y: 20}}
                animate={{opacity: 1, y: 0}}
                className={`${backgroundImage ? 'bg-white/95 backdrop-blur-sm' : 'bg-white'} rounded-xl shadow-md overflow-hidden`}
              >
                {post.image && (
                  <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
                )}
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold text-ebeltoft-dark mb-2">{post.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <SafeIcon icon={FiUser} className="w-4 h-4" />
                          <span>{post.author}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <SafeIcon icon={FiCalendar} className="w-4 h-4" />
                          <span>{formatDate(post.date)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {(post.authorId === user.id || user?.isSuperUser) && (
                        <>
                          <button
                            onClick={() => startEdit(post)}
                            className="text-ebeltoft-blue hover:text-ebeltoft-dark transition-colors"
                          >
                            <SafeIcon icon={FiEdit3} className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deletePost(post.id)}
                            className="text-red-500 hover:text-red-700 transition-colors"
                          >
                            <SafeIcon icon={FiTrash2} className="w-5 h-5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  <div 
                    className="prose prose-sm max-w-none text-gray-700" 
                    dangerouslySetInnerHTML={{__html: post.content}} 
                  />
                </div>
              </motion.article>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default Guides;