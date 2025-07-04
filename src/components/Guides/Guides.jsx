import React,{useState,useEffect} from 'react';
import {motion} from 'framer-motion';
import {useAuth} from '../../contexts/AuthContext';
import {useDropzone} from 'react-dropzone';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import SafeIcon from '../../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import toast from 'react-hot-toast';

const {FiBook,FiPlus,FiTrash2,FiUser,FiCalendar,FiImage}=FiIcons;

const Guides=()=> {
  const {user}=useAuth();
  const [posts,setPosts]=useState([]);
  const [newPost,setNewPost]=useState({
    title: '',
    content: '',
    image: null
  });
  const [showForm,setShowForm]=useState(false);

  useEffect(()=> {
    const storedPosts=JSON.parse(localStorage.getItem('sommerhus_guides_posts') || '[]');
    setPosts(storedPosts);
  },[]);

  const modules={
    toolbar: [
      [{'header': [1,2,false]}],
      ['bold','italic','underline','strike','blockquote'],
      [{'list': 'ordered'},{'list': 'bullet'},{'indent': '-1'},{'indent': '+1'}],
      ['link','code-block'],
      ['clean']
    ],
  };

  const formats=[
    'header','bold','italic','underline','strike','blockquote',
    'list','bullet','indent','link','code-block'
  ];

  const onDrop=(acceptedFiles)=> {
    const file=acceptedFiles[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {// 10MB limit
        toast.error('Billedet er for stort. Maksimum 10MB.');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Kun billeder er tilladt.');
        return;
      }

      const reader=new FileReader();
      reader.onload=(e)=> {
        setNewPost({...newPost,image: e.target.result});
      };
      reader.readAsDataURL(file);
    }
  };

  const {getRootProps,getInputProps,isDragActive}=useDropzone({
    onDrop,
    accept: {'image/*': ['.jpeg','.jpg','.png','.gif','.webp']},
    maxSize: 10 * 1024 * 1024,// 10MB
    multiple: false
  });

  const handleSubmit=(e)=> {
    e.preventDefault();
    if (newPost.title.trim() && newPost.content.trim()) {
      const post={
        id: Date.now(),
        title: newPost.title,
        content: newPost.content,
        image: newPost.image,
        author: user.fullName,
        authorId: user.id,
        date: new Date().toISOString(),
      };

      const updatedPosts=[post,...posts];
      setPosts(updatedPosts);
      localStorage.setItem('sommerhus_guides_posts',JSON.stringify(updatedPosts));

      setNewPost({title: '',content: '',image: null});
      setShowForm(false);
      toast.success('Guide oprettet!');
    }
  };

  const deletePost=(id)=> {
    const updatedPosts=posts.filter(post=> post.id !==id);
    setPosts(updatedPosts);
    localStorage.setItem('sommerhus_guides_posts',JSON.stringify(updatedPosts));
    toast.success('Guide slettet');
  };

  const formatDate=(dateString)=> {
    const date=new Date(dateString);
    return date.toLocaleDateString('da-DK',{
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
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
          <motion.button
            onClick={()=> setShowForm(!showForm)}
            className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors flex items-center gap-2"
            whileHover={{scale: 1.05}}
            whileTap={{scale: 0.95}}
          >
            <SafeIcon icon={FiPlus} className="w-5 h-5" />
            Ny guide
          </motion.button>
        </div>

        {showForm && (
          <motion.form
            initial={{opacity: 0,height: 0}}
            animate={{opacity: 1,height: 'auto'}}
            exit={{opacity: 0,height: 0}}
            onSubmit={handleSubmit}
            className="bg-ebeltoft-light rounded-xl p-6 mb-6"
          >
            <h3 className="text-lg font-semibold text-ebeltoft-dark mb-4">Opret ny guide</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titel</label>
                <input
                  type="text"
                  value={newPost.title}
                  onChange={(e)=> setNewPost({...newPost,title: e.target.value})}
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
                    onChange={(content)=> setNewPost({...newPost,content})}
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
                    isDragActive
                      ? 'border-ebeltoft-blue bg-blue-50'
                      : 'border-gray-300 hover:border-ebeltoft-blue'
                  }`}
                >
                  <input {...getInputProps()} />
                  {newPost.image ? (
                    <div className="space-y-2">
                      <img
                        src={newPost.image}
                        alt="Preview"
                        className="max-h-32 mx-auto rounded"
                      />
                      <p className="text-sm text-green-600">Billede uploadet</p>
                    </div>
                  ) : (
                    <>
                      <SafeIcon icon={FiImage} className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-600">
                        {isDragActive
                          ? 'Slip billedet her...'
                          : 'Træk og slip billede her,eller klik for at vælge'
                        }
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG,PNG,GIF,WebP (max 10MB)
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                type="submit"
                className="px-6 py-2 bg-ebeltoft-blue text-white rounded-lg hover:bg-ebeltoft-dark transition-colors"
              >
                Gem guide
              </button>
              <button
                type="button"
                onClick={()=> {
                  setNewPost({title: '',content: '',image: null});
                  setShowForm(false);
                }}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Annuller
              </button>
            </div>
          </motion.form>
        )}
      </div>

      <div className="space-y-6">
        {posts.length===0 ? (
          <div className="bg-white rounded-xl shadow-md p-8 text-center">
            <SafeIcon icon={FiBook} className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-800 mb-2">Ingen guides endnu</h3>
            <p className="text-gray-600">Opret den første guide til sommerhuset.</p>
          </div>
        ) : (
          posts.map((post)=> (
            <motion.article
              key={post.id}
              initial={{opacity: 0,y: 20}}
              animate={{opacity: 1,y: 0}}
              className="bg-white rounded-xl shadow-md overflow-hidden"
            >
              {post.image && (
                <img
                  src={post.image}
                  alt={post.title}
                  className="w-full h-48 object-cover"
                />
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
                  {post.authorId===user.id && (
                    <button
                      onClick={()=> deletePost(post.id)}
                      className="text-red-500 hover:text-red-700 transition-colors"
                    >
                      <SafeIcon icon={FiTrash2} className="w-5 h-5" />
                    </button>
                  )}
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
    </div>
  );
};

export default Guides;