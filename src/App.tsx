/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent, useRef } from "react";
import { Plus, Trash2, UserCircle, X, Play, Search, Home, Calendar, Tv, Film, Pencil, MessageSquareText, AudioLines, ThumbsUp, Subtitles, ArrowLeft, RotateCcw, Pause, AlignLeft, Keyboard, Upload, Check } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

const PLACEHOLDER_SVG = `data:image/svg+xml;base64,${btoa(`
<svg width="800" height="400" viewBox="0 0 800 400" xmlns="http://www.w3.org/2000/svg">
  <text x="100" y="200" font-family="cursive" font-size="80" fill="white" transform="rotate(-5 100 200)">he he</text>
  <text x="150" y="300" font-family="cursive" font-size="100" fill="white" transform="rotate(2 150 300)">placeholder</text>
</svg>
`)}`;

interface Video {
  id: number;
  title: string;
  description: string;
  filename: string;
  thumbnail?: string;
  logo?: string;
  year?: string;
  rating?: string;
  duration?: string;
  quality?: string;
  audio?: string;
  hasSubtitles?: boolean;
  hasAD?: boolean;
  trailer?: string;
}

interface Profile {
  name: string;
  color: string;
  image?: string;
}

const INITIAL_PROFILES: Profile[] = [
  { name: "Ashley", color: "bg-red-500" },
  { name: "Jake", color: "bg-blue-500" },
  { name: "Hopper lives", color: "bg-zinc-700" },
];

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [view, setView] = useState<'selection' | 'home' | 'library' | 'details' | 'search'>('selection');
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [year, setYear] = useState("2026");
  const [rating, setRating] = useState("TV-MA");
  const [duration, setDuration] = useState("");
  const [quality, setQuality] = useState("HD");
  const [audio, setAudio] = useState("5.1");
  const [hasSubtitles, setHasSubtitles] = useState(true);
  const [hasAD, setHasAD] = useState(true);
  const [file, setFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [trailerFile, setTrailerFile] = useState<File | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Profile[]>(INITIAL_PROFILES);
  const [selectedProfileIndex, setSelectedProfileIndex] = useState(0);
  const [focusedProfileIndex, setFocusedProfileIndex] = useState(0);
  const [editingProfileIndex, setEditingProfileIndex] = useState<number | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditFocused, setIsEditFocused] = useState(false);
  const [modalFocus, setModalFocus] = useState<{ area: 'close' | 'image' | 'name' | 'keyboard-toggle' | 'onscreen' | 'save' | 'cancel', index: number }>({ area: 'name', index: 0 });
  const [editName, setEditName] = useState("");
  const [editImage, setEditImage] = useState<string | undefined>(undefined);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [storageInfo, setStorageInfo] = useState<{ location: string; isLocal: boolean } | null>(null);
  const [focus, setFocus] = useState<{ area: 'sidebar' | 'hero' | 'trending' | 'recommended' | 'latest', index: number }>({ area: 'hero', index: 0 });
  const [heroVideo, setHeroVideo] = useState<Video | null>(null);
  const [recommendedVideos, setRecommendedVideos] = useState<Video[]>([]);
  const [latestVideos, setLatestVideos] = useState<Video[]>([]);

  const fetchVideos = async () => {
    try {
      const res = await fetch("/api/videos");
      if (res.ok) {
        const text = await res.text();
        try {
          setVideos(JSON.parse(text));
        } catch (e) {
          console.error("Failed to parse videos JSON", text.slice(0, 100));
        }
      }
    } catch (error) {
      console.error("Failed to fetch videos", error);
    }
  };

  useEffect(() => {
    fetchVideos();

    fetch("/api/storage-info")
      .then(async res => {
        if (res.ok) {
          const text = await res.text();
          try {
            setStorageInfo(JSON.parse(text));
          } catch (e) {}
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isEditModalOpen) {
      const handleModalKeyDown = (e: KeyboardEvent) => {
        const keyboardKeys = "QWERTYUIOPASDFGHJKLZXCVBNM".split("");
        const totalKeys = keyboardKeys.length + 2; // + DEL + SPACE

        if (e.key === 'ArrowDown') {
          if (modalFocus.area === 'close') setModalFocus({ area: 'image', index: 0 });
          else if (modalFocus.area === 'image') setModalFocus({ area: 'name', index: 0 });
          else if (modalFocus.area === 'name' || modalFocus.area === 'keyboard-toggle') {
            if (isKeyboardOpen) setModalFocus({ area: 'onscreen', index: 0 });
            else setModalFocus({ area: 'save', index: 0 });
          }
          else if (modalFocus.area === 'onscreen') {
            if (modalFocus.index < 10) setModalFocus({ area: 'onscreen', index: modalFocus.index + 10 });
            else if (modalFocus.index < 20) setModalFocus({ area: 'onscreen', index: Math.min(modalFocus.index + 10, 25) });
            else if (modalFocus.index < 26) setModalFocus({ area: 'onscreen', index: 26 }); // DEL
            else if (modalFocus.index === 26) setModalFocus({ area: 'onscreen', index: 27 }); // SPACE
            else setModalFocus({ area: 'save', index: 0 });
          }
          else if (modalFocus.area === 'save' || modalFocus.area === 'cancel') {
            // Stay at bottom
          }
        } else if (e.key === 'ArrowUp') {
          if (modalFocus.area === 'save' || modalFocus.area === 'cancel') {
            if (isKeyboardOpen) setModalFocus({ area: 'onscreen', index: 27 });
            else setModalFocus({ area: 'name', index: 0 });
          }
          else if (modalFocus.area === 'onscreen') {
            if (modalFocus.index === 27) setModalFocus({ area: 'onscreen', index: 26 });
            else if (modalFocus.index === 26) setModalFocus({ area: 'onscreen', index: 20 });
            else if (modalFocus.index >= 10) setModalFocus({ area: 'onscreen', index: modalFocus.index - 10 });
            else setModalFocus({ area: 'name', index: 0 });
          }
          else if (modalFocus.area === 'name' || modalFocus.area === 'keyboard-toggle') setModalFocus({ area: 'image', index: 0 });
          else if (modalFocus.area === 'image') setModalFocus({ area: 'close', index: 0 });
        } else if (e.key === 'ArrowLeft') {
          if (modalFocus.area === 'keyboard-toggle') setModalFocus({ area: 'name', index: 0 });
          else if (modalFocus.area === 'cancel') setModalFocus({ area: 'save', index: 0 });
          else if (modalFocus.area === 'onscreen') {
            if (modalFocus.index > 0) setModalFocus({ area: 'onscreen', index: modalFocus.index - 1 });
          }
        } else if (e.key === 'ArrowRight') {
          if (modalFocus.area === 'name') setModalFocus({ area: 'keyboard-toggle', index: 0 });
          else if (modalFocus.area === 'save') setModalFocus({ area: 'cancel', index: 0 });
          else if (modalFocus.area === 'onscreen') {
            if (modalFocus.index < totalKeys - 1) setModalFocus({ area: 'onscreen', index: modalFocus.index + 1 });
          }
        } else if (e.key === 'Enter') {
          if (modalFocus.area === 'close') setIsEditModalOpen(false);
          else if (modalFocus.area === 'image') {
            const input = document.querySelector('input[type="file"]') as HTMLInputElement;
            if (input) input.click();
          }
          else if (modalFocus.area === 'name') {
            // Focus input?
          }
          else if (modalFocus.area === 'keyboard-toggle') setIsKeyboardOpen(!isKeyboardOpen);
          else if (modalFocus.area === 'onscreen') {
            if (modalFocus.index < 26) setEditName(prev => prev + keyboardKeys[modalFocus.index]);
            else if (modalFocus.index === 26) setEditName(prev => prev.slice(0, -1));
            else if (modalFocus.index === 27) setEditName(prev => prev + " ");
          }
          else if (modalFocus.area === 'save') saveProfile();
          else if (modalFocus.area === 'cancel') setIsEditModalOpen(false);
        } else if (e.key === 'Escape') {
          setIsEditModalOpen(false);
        }
      };
      window.addEventListener('keydown', handleModalKeyDown);
      return () => window.removeEventListener('keydown', handleModalKeyDown);
    }
  }, [isEditModalOpen, modalFocus, isKeyboardOpen, editName, userProfiles, editingProfileIndex]);

  const handleProfileClick = (index: number) => {
    setSelectedProfileIndex(index);
    setIsLoggedIn(true);
    setView('home');
  };

  const handleEditProfile = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingProfileIndex(index);
    setEditName(userProfiles[index].name);
    setEditImage(userProfiles[index].image);
    setIsEditModalOpen(true);
    setIsKeyboardOpen(false);
  };

  const saveProfile = () => {
    if (editingProfileIndex !== null) {
      const updatedProfiles = [...userProfiles];
      updatedProfiles[editingProfileIndex] = {
        ...updatedProfiles[editingProfileIndex],
        name: editName,
        image: editImage
      };
      setUserProfiles(updatedProfiles);
      setIsEditModalOpen(false);
      setEditingProfileIndex(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  useEffect(() => {
    if (!isLoggedIn && !isEditModalOpen) {
      const handleKeyDown = (e: KeyboardEvent) => {
        const totalProfiles = userProfiles.length + 1; // +1 for Add Profile
        if (e.key === 'ArrowDown') {
          setFocusedProfileIndex(prev => (prev + 1) % totalProfiles);
          setIsEditFocused(false);
        } else if (e.key === 'ArrowUp') {
          setFocusedProfileIndex(prev => (prev - 1 + totalProfiles) % totalProfiles);
          setIsEditFocused(false);
        } else if (e.key === 'ArrowLeft') {
          if (focusedProfileIndex < userProfiles.length) {
            setIsEditFocused(true);
          }
        } else if (e.key === 'ArrowRight') {
          setIsEditFocused(false);
        } else if (e.key === 'Enter') {
          if (isEditFocused) {
            handleEditProfile(focusedProfileIndex);
          } else if (focusedProfileIndex < userProfiles.length) {
            handleProfileClick(focusedProfileIndex);
          }
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isLoggedIn, focusedProfileIndex, isEditModalOpen, userProfiles, isEditFocused]);

  const handleUpload = async (e: FormEvent) => {
    e.preventDefault();
    if (!title || (!file && !editingVideo) || isUploading) return;

    setIsUploading(true);
    
    // Check file size before uploading (warn if > 32MB as it's a common proxy limit)
    if (file && file.size > 32 * 1024 * 1024) {
      const proceed = window.confirm(`This video is quite large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Some servers might reject files larger than 32MB. Do you want to try anyway?`);
      if (!proceed) {
        setIsUploading(false);
        return;
      }
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("description", description);
    formData.append("year", year);
    formData.append("rating", rating);
    formData.append("duration", duration);
    formData.append("quality", quality);
    formData.append("audio", audio);
    formData.append("hasSubtitles", hasSubtitles ? "1" : "0");
    formData.append("hasAD", hasAD ? "1" : "0");
    if (file) formData.append("video", file);
    if (thumbnailFile) formData.append("thumbnail", thumbnailFile);
    if (logoFile) formData.append("logo", logoFile);
    if (trailerFile) formData.append("trailer", trailerFile);

    try {
      const url = editingVideo ? `/api/videos/${editingVideo.id}` : "/api/videos";
      const method = editingVideo ? "PUT" : "POST";
      
      const response = await fetch(url, {
        method,
        body: formData,
      });

      if (!response.ok) {
        let errorMessage = "Upload failed";
        const text = await response.text();
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // If not JSON, use the text (might be HTML error)
          errorMessage = `Server error (${response.status}): ${text.slice(0, 100)}...`;
        }
        throw new Error(errorMessage);
      }
      
      setTitle("");
      setDescription("");
      setYear("2026");
      setRating("TV-MA");
      setDuration("");
      setQuality("HD");
      setAudio("5.1");
      setHasSubtitles(true);
      setHasAD(true);
      setFile(null);
      setThumbnailFile(null);
      setLogoFile(null);
      setTrailerFile(null);
      setEditingVideo(null);
      
      // Refresh videos list safely
      const res = await fetch("/api/videos");
      if (res.ok) {
        const text = await res.text();
        try {
          setVideos(JSON.parse(text));
        } catch (e) {
          console.error("Failed to parse refreshed videos", text.slice(0, 100));
        }
      }
    } catch (error) {
      console.error("Upload error", error);
      alert(error instanceof Error ? error.message : "An error occurred during upload");
    } finally {
      setIsUploading(false);
    }
  };

  const startEdit = (video: Video) => {
    setEditingVideo(video);
    setTitle(video.title);
    setDescription(video.description || "");
    setYear(video.year || "2026");
    setRating(video.rating || "TV-MA");
    setDuration(video.duration || "");
    setQuality(video.quality || "HD");
    setAudio(video.audio || "5.1");
    setHasSubtitles(!!video.hasSubtitles);
    setHasAD(!!video.hasAD);
    setFile(null);
    setThumbnailFile(null);
    setLogoFile(null);
    setTrailerFile(null);
  };

  const cancelEdit = () => {
    setEditingVideo(null);
    setTitle("");
    setDescription("");
    setYear("2026");
    setRating("TV-MA");
    setDuration("");
    setQuality("HD");
    setAudio("5.1");
    setHasSubtitles(true);
    setHasAD(true);
    setFile(null);
    setThumbnailFile(null);
    setLogoFile(null);
    setTrailerFile(null);
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/videos/${id}`, { method: "DELETE" });
    setVideos(videos.filter((v) => v.id !== id));
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden flex items-center">
        <div className="absolute top-16 left-32 flex flex-col items-center z-10">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/0/08/Netflix_2015_logo.svg" 
            alt="Netflix" 
            className="h-10 mb-2" 
          />
          <div className="text-zinc-500 text-sm font-bold mb-8 w-full text-center">Choose a Profile</div>
          
          <div className="flex flex-col gap-[10px] items-center">
            {userProfiles.map((p, i) => (
              <div key={i} className="flex items-center gap-4 group relative">
                {/* Edit Icon */}
                <button 
                  onClick={(e) => handleEditProfile(i, e)}
                  className={`absolute -left-18 p-2 rounded-full bg-transparent text-white transition-all duration-300 ${
                    focusedProfileIndex === i ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'
                  } hover:scale-125 ${isEditFocused && focusedProfileIndex === i ? 'scale-125' : ''}`}
                >
                  <div className="flex items-center gap-2">
                    <Pencil size={24} />
                    <AlignLeft size={18} />
                  </div>
                </button>

                <button 
                  onClick={() => handleProfileClick(i)} 
                  className="flex items-center gap-6 group relative transition-all duration-300"
                >
                  <div className={`${p.color} flex items-center justify-center text-4xl transition-all duration-300 ${
                    focusedProfileIndex === i 
                      ? `w-28 h-28 opacity-100 ${isEditFocused ? 'ring-2 ring-white/30 scale-90' : 'ring-4 ring-white'}` 
                      : 'w-[70px] h-[70px] opacity-40 group-hover:opacity-60'
                  }`}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle size={focusedProfileIndex === i ? 64 : 40} className="transition-all duration-300" />
                    )}
                  </div>
                  
                  {focusedProfileIndex === i && (
                    <div className={`absolute left-[144px] whitespace-nowrap text-3xl font-bold text-white animate-in fade-in slide-in-from-left-4 duration-300 ${isEditFocused ? 'opacity-40 scale-95' : 'opacity-100'}`}>
                      {p.name}
                    </div>
                  )}
                </button>
              </div>
            ))}
            
            <button className="flex items-center gap-6 group relative transition-all duration-300">
              <div className={`bg-zinc-700 flex items-center justify-center text-zinc-950 transition-all duration-300 ${
                focusedProfileIndex === userProfiles.length 
                  ? 'w-28 h-28 ring-4 ring-white opacity-100' 
                  : 'w-[70px] h-[70px] opacity-40 group-hover:opacity-60'
              }`}>
                <Plus size={focusedProfileIndex === userProfiles.length ? 64 : 40} className="transition-all duration-300" />
              </div>
              {focusedProfileIndex === userProfiles.length && (
                <div className="absolute left-[144px] whitespace-nowrap text-3xl font-bold text-white animate-in fade-in slide-in-from-left-4 duration-300">
                  Add Profile
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Edit Profile Pop-up */}
        <AnimatePresence>
          {isEditModalOpen && (
            <motion.div 
              initial={{ opacity: 0, x: 100 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 100 }}
              className="absolute right-0 top-0 h-full w-[450px] bg-zinc-900 border-l border-white/10 shadow-2xl z-50 p-10 flex flex-col"
            >
              <div className="flex justify-between items-center mb-12">
                <h2 className="text-4xl font-black">Edit Profile</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)} 
                  className={`p-2 rounded-full transition-colors ${modalFocus.area === 'close' ? 'bg-white text-black' : 'hover:bg-zinc-800'}`}
                >
                  <X size={32} />
                </button>
              </div>

              <div className="space-y-10 flex-1">
                <div className="flex flex-col items-center gap-6">
                  <div className={`w-40 h-40 ${userProfiles[editingProfileIndex!].color} flex items-center justify-center relative group overflow-hidden ${modalFocus.area === 'image' ? 'ring-4 ring-white' : ''}`}>
                    {editImage ? (
                      <img src={editImage} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <UserCircle size={100} />
                    )}
                    <label className={`absolute inset-0 bg-black/60 transition-opacity flex flex-col items-center justify-center cursor-pointer ${modalFocus.area === 'image' ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <Upload size={32} className="mb-2" />
                      <span className="text-xs font-bold uppercase tracking-widest">Change Picture</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest text-zinc-500">Profile Name</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setIsKeyboardOpen(!isKeyboardOpen);
                        }
                      }}
                      className={`w-full bg-zinc-800 border-none p-6 text-2xl font-bold transition-all ${modalFocus.area === 'name' ? 'ring-2 ring-white' : 'focus:ring-2 focus:ring-white'}`}
                      placeholder="Enter name"
                    />
                    <button 
                      onClick={() => setIsKeyboardOpen(!isKeyboardOpen)}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded transition-colors ${
                        modalFocus.area === 'keyboard-toggle' ? 'bg-white text-black' : 
                        isKeyboardOpen ? 'bg-zinc-600 text-white' : 'text-zinc-500 hover:text-white'
                      }`}
                    >
                      <Keyboard size={24} />
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 italic">Press Enter on the name field to toggle the onscreen keyboard</p>
                </div>

                {isKeyboardOpen && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-zinc-800 p-4 rounded-xl grid grid-cols-10 gap-2"
                  >
                    {"QWERTYUIOPASDFGHJKLZXCVBNM".split("").map((key, idx) => (
                      <button 
                        key={key}
                        onClick={() => setEditName(prev => prev + key)}
                        className={`aspect-square flex items-center justify-center rounded font-bold text-sm transition-colors ${
                          modalFocus.area === 'onscreen' && modalFocus.index === idx ? 'bg-white text-black' : 'bg-zinc-700 hover:bg-zinc-600'
                        }`}
                      >
                        {key}
                      </button>
                    ))}
                    <button 
                      onClick={() => setEditName(prev => prev.slice(0, -1))}
                      className={`col-span-2 rounded font-bold text-sm transition-colors ${
                        modalFocus.area === 'onscreen' && modalFocus.index === 26 ? 'bg-white text-black' : 'bg-zinc-700 hover:bg-zinc-600'
                      }`}
                    >
                      DEL
                    </button>
                    <button 
                      onClick={() => setEditName(prev => prev + " ")}
                      className={`col-span-8 rounded font-bold text-sm transition-colors ${
                        modalFocus.area === 'onscreen' && modalFocus.index === 27 ? 'bg-white text-black' : 'bg-zinc-700 hover:bg-zinc-600'
                      }`}
                    >
                      SPACE
                    </button>
                  </motion.div>
                )}
              </div>

              <div className="pt-8 flex gap-4">
                <button 
                  onClick={saveProfile}
                  className={`flex-1 py-4 rounded font-black text-xl transition-colors flex items-center justify-center gap-2 ${
                    modalFocus.area === 'save' ? 'bg-emerald-500 text-white' : 'bg-white text-black hover:bg-zinc-200'
                  }`}
                >
                  <Check size={24} /> Save Changes
                </button>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className={`px-8 py-4 rounded font-black text-xl transition-colors ${
                    modalFocus.area === 'cancel' ? 'bg-white text-black' : 'bg-zinc-800 hover:bg-zinc-700'
                  }`}
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  if (view === 'home') {
    return (
      <HomeView 
        videos={videos} 
        setView={setView} 
        setSelectedVideo={setSelectedVideo} 
        selectedProfileIndex={selectedProfileIndex} 
        userProfiles={userProfiles}
        setIsLoggedIn={setIsLoggedIn}
        focus={focus}
        setFocus={setFocus}
        heroVideo={heroVideo}
        setHeroVideo={setHeroVideo}
        recommendedVideos={recommendedVideos}
        setRecommendedVideos={setRecommendedVideos}
        latestVideos={latestVideos}
        setLatestVideos={setLatestVideos}
      />
    );
  }

  if (view === 'search') {
    return (
      <SearchView 
        videos={videos} 
        setView={setView} 
        selectedProfileIndex={selectedProfileIndex} 
        userProfiles={userProfiles}
        setIsLoggedIn={setIsLoggedIn}
        setSelectedVideo={setSelectedVideo}
      />
    );
  }

  if (view === 'details' && selectedVideo) {
    return <DetailsView video={selectedVideo} setView={setView} setSelectedVideo={setSelectedVideo} />;
  }

  if (view === 'library') {
    return (
      <div className="min-h-screen bg-zinc-950 text-white p-8 overflow-x-hidden">
        <div className="max-w-[1344px] mx-auto">
          <div className="flex justify-between items-start mb-8">
            <button onClick={() => { setView('home'); cancelEdit(); }} className="text-zinc-400 hover:text-white flex items-center gap-2 transition-colors">
              <X size={20} /> Close Management
            </button>
            {storageInfo && (
              <div className="text-right font-mono text-[10px] opacity-40 uppercase">
                Storage: {storageInfo.isLocal ? "Raspberry Pi Disk" : "Cloud"}<br />
                Path: {storageInfo.location}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            {/* Form Section */}
            <div className="lg:col-span-6 xl:col-span-5">
              <h1 className="text-3xl font-bold mb-6">{editingVideo ? 'Edit Video' : 'Upload New Video'}</h1>
              <form onSubmit={handleUpload} className="space-y-6 bg-zinc-900 p-6 rounded-2xl border border-white/5">
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Title</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)} 
                    placeholder="Enter video title" 
                    className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Description</label>
                  <textarea 
                    value={description} 
                    onChange={(e) => setDescription(e.target.value)} 
                    placeholder="Enter video description" 
                    rows={4}
                    className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all resize-none" 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Year</label>
                    <select 
                      value={year} 
                      onChange={(e) => setYear(e.target.value)}
                      className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      {Array.from({ length: 30 }, (_, i) => 2026 - i).map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Rating</label>
                    <select 
                      value={rating} 
                      onChange={(e) => setRating(e.target.value)}
                      className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <optgroup label="TV Ratings">
                        <option value="TV-Y">TV-Y</option>
                        <option value="TV-Y7">TV-Y7</option>
                        <option value="TV-G">TV-G</option>
                        <option value="TV-PG">TV-PG</option>
                        <option value="TV-14">TV-14</option>
                        <option value="TV-MA">TV-MA</option>
                      </optgroup>
                      <optgroup label="Movie Ratings">
                        <option value="G">G</option>
                        <option value="PG">PG</option>
                        <option value="PG-13">PG-13</option>
                        <option value="R">R</option>
                        <option value="NC-17">NC-17</option>
                      </optgroup>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Duration (e.g. 1h 32m)</label>
                    <input 
                      type="text" 
                      value={duration} 
                      onChange={(e) => setDuration(e.target.value)} 
                      placeholder="1h 32m" 
                      className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Quality</label>
                    <select 
                      value={quality} 
                      onChange={(e) => setQuality(e.target.value)}
                      className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="SD">SD</option>
                      <option value="HD">HD</option>
                      <option value="4K">4K</option>
                      <option value="UHD">UHD</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Audio</label>
                    <select 
                      value={audio} 
                      onChange={(e) => setAudio(e.target.value)}
                      className="w-full bg-zinc-800 border border-white/10 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
                    >
                      <option value="Stereo">Stereo</option>
                      <option value="5.1">5.1</option>
                      <option value="7.1">7.1</option>
                      <option value="Atmos">Atmos</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-400 mb-2">Features</label>
                    <div className="flex items-center h-[50px] px-4 bg-zinc-800 border border-white/10 rounded-lg gap-6">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={hasSubtitles} 
                            onChange={(e) => setHasSubtitles(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-8 h-4 rounded-full transition-colors ${hasSubtitles ? 'bg-emerald-600' : 'bg-zinc-700'}`} />
                          <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${hasSubtitles ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">Subtitles</span>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer group">
                        <div className="relative">
                          <input 
                            type="checkbox" 
                            checked={hasAD} 
                            onChange={(e) => setHasAD(e.target.checked)}
                            className="sr-only"
                          />
                          <div className={`w-8 h-4 rounded-full transition-colors ${hasAD ? 'bg-emerald-600' : 'bg-zinc-700'}`} />
                          <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-transform ${hasAD ? 'translate-x-4' : 'translate-x-0'}`} />
                        </div>
                        <span className="text-xs font-medium text-zinc-400 group-hover:text-zinc-300 transition-colors">AD</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Video File {editingVideo && '(Optional)'}</label>
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="video/*"
                      onChange={(e) => setFile(e.target.files?.[0] || null)} 
                      className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Thumbnail Image (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} 
                    className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Logo Image (Optional)</label>
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => setLogoFile(e.target.files?.[0] || null)} 
                    className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer" 
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-400 mb-2">Trailer Video (Optional)</label>
                  <input 
                    type="file" 
                    accept="video/*"
                    onChange={(e) => setTrailerFile(e.target.files?.[0] || null)} 
                    className="w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-zinc-800 file:text-zinc-300 hover:file:bg-zinc-700 cursor-pointer" 
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button 
                    type="submit" 
                    disabled={!title || (!file && !editingVideo) || isUploading} 
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 py-3 rounded-lg font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {isUploading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      editingVideo ? 'Update Video' : 'Upload Video'
                    )}
                  </button>
                  {editingVideo && (
                    <button 
                      type="button"
                      onClick={cancelEdit}
                      className="px-6 bg-zinc-800 hover:bg-zinc-700 rounded-lg font-bold transition-all"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List Section */}
            <div className="lg:col-span-6 xl:col-span-7">
              <h2 className="text-3xl font-bold mb-6">Manage Existing Videos</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {videos.length === 0 ? (
                  <div className="col-span-full py-20 text-center bg-zinc-900/50 rounded-2xl border border-dashed border-white/10">
                    <p className="text-zinc-500">No videos uploaded yet.</p>
                  </div>
                ) : (
                  videos.map((video) => (
                    <div key={video.id} className="bg-zinc-900 rounded-2xl overflow-hidden border border-white/5 group hover:border-white/20 transition-all">
                      <div className="aspect-[5/7] bg-zinc-800 relative overflow-hidden">
                        {video.thumbnail ? (
                          <img src={`/uploads/${video.thumbnail}`} alt={video.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <video src={`/uploads/${video.filename}`} className="w-full h-full object-cover" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                          <button 
                            onClick={() => startEdit(video)}
                            className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform"
                          >
                            <Pencil size={20} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="text-lg font-bold truncate mb-1">{video.title}</h3>
                        <p className="text-zinc-500 text-sm line-clamp-2 mb-4 h-10">{video.description || 'No description'}</p>
                        <div className="flex justify-between items-center">
                          <button 
                            onClick={() => startEdit(video)}
                            className="text-emerald-500 text-sm font-bold hover:text-emerald-400 transition-colors"
                          >
                            Edit Details
                          </button>
                          <button 
                            onClick={() => handleDelete(video.id)} 
                            className="text-zinc-600 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function Sidebar({ 
  focus, 
  setFocus, 
  activeTab, 
  currentProfile, 
  setIsLoggedIn, 
  sidebarItems,
  onMouseEnter,
  onMouseLeave
}: { 
  focus: { area: string, index: number }, 
  setFocus: React.Dispatch<React.SetStateAction<any>>, 
  activeTab: string, 
  currentProfile: any, 
  setIsLoggedIn: (b: boolean) => void, 
  sidebarItems: any[],
  onMouseEnter?: () => void,
  onMouseLeave?: () => void
}) {
  return (
    <nav 
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className={`fixed left-0 top-0 h-full z-50 flex flex-col transition-all duration-300 ${
        focus.area === 'sidebar' 
          ? 'w-80 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent' 
          : 'w-24 bg-transparent'
      }`}
    >
      {/* Profile Section */}
      <div className={`pt-12 mb-8 transition-all duration-300 ${focus.area === 'sidebar' ? 'pl-10' : 'pl-4'}`}>
        <button 
          onClick={() => setIsLoggedIn(false)}
          className="flex items-center gap-4 p-3 group w-full text-left transition-all duration-300"
        >
          <div className={`w-10 h-10 shrink-0 ${currentProfile.color} flex items-center justify-center rounded transition-transform overflow-hidden ${
            focus.area === 'sidebar' && focus.index === 0 ? 'scale-110 shadow-lg shadow-white/10' : 'group-hover:scale-110'
          }`}>
            {currentProfile.image ? (
              <img src={currentProfile.image} alt={currentProfile.name} className="w-full h-full object-cover" />
            ) : (
              <UserCircle size={24} />
            )}
          </div>
          <div className={`transition-all duration-300 ${focus.area === 'sidebar' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 pointer-events-none'}`}>
            <div className={`leading-tight transition-all duration-300 ${
              focus.area === 'sidebar' && focus.index === 0 
                ? 'text-white font-black' 
                : 'text-zinc-400 font-bold group-hover:text-white group-hover:font-black'
            }`}>
              {currentProfile.name}
            </div>
            <div className={`text-xs transition-all duration-300 ${
              focus.area === 'sidebar' && focus.index === 0 
                ? 'text-white font-bold' 
                : 'text-zinc-500 font-medium group-hover:text-white group-hover:font-bold'
            }`}>
              Switch Profiles
            </div>
          </div>
        </button>
      </div>

      <div className={`flex flex-col gap-6 flex-1 justify-center transition-all duration-300 ${focus.area === 'sidebar' ? 'pl-10' : 'pl-4'} pr-4`}>
        {sidebarItems.map((item, index) => {
          const isActive = item.name === activeTab;
          return (
            <button
              key={index}
              onClick={item.onClick}
              className="group relative flex items-center gap-4 p-3 transition-all duration-300 w-full"
            >
              <div className="relative flex items-center justify-center">
                <item.icon 
                  size={24} 
                  className={`transition-all duration-300 shrink-0 ${
                    focus.area === 'sidebar' 
                      ? (focus.index === index + 1 ? 'text-white scale-125' : 'text-zinc-600') 
                      : (isActive ? 'text-white' : 'text-zinc-400 group-hover:text-white group-hover:scale-125')
                  }`} 
                />
                {isActive && (
                  <motion.div 
                    layoutId="sidebar-active-indicator"
                    className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-0.5 bg-red-600 rounded-full"
                  />
                )}
              </div>
              <span className={`transition-all duration-300 ${
                focus.area === 'sidebar' 
                  ? (focus.index === index + 1 
                      ? 'text-white opacity-100 translate-x-0 font-black' 
                      : 'text-zinc-500 opacity-50 translate-x-0 font-medium') 
                  : 'opacity-0 -translate-x-4 pointer-events-none'
              } ${focus.area !== 'sidebar' ? 'group-hover:opacity-100 group-hover:translate-x-0 group-hover:text-white group-hover:font-black' : ''}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function HomeView({ 
  videos, 
  setView, 
  setSelectedVideo, 
  selectedProfileIndex, 
  userProfiles,
  setIsLoggedIn,
  focus,
  setFocus,
  heroVideo,
  setHeroVideo,
  recommendedVideos,
  setRecommendedVideos,
  latestVideos,
  setLatestVideos
}: { 
  videos: Video[], 
  setView: (view: 'selection' | 'home' | 'library' | 'details' | 'search') => void,
  setSelectedVideo: (video: Video | null) => void,
  selectedProfileIndex: number,
  userProfiles: Profile[],
  setIsLoggedIn: (loggedIn: boolean) => void,
  focus: { area: 'sidebar' | 'hero' | 'trending' | 'recommended' | 'latest', index: number },
  setFocus: React.Dispatch<React.SetStateAction<{ area: 'sidebar' | 'hero' | 'trending' | 'recommended' | 'latest', index: number }>>,
  heroVideo: Video | null,
  setHeroVideo: (video: Video | null) => void,
  recommendedVideos: Video[],
  setRecommendedVideos: (videos: Video[]) => void,
  latestVideos: Video[],
  setLatestVideos: (videos: Video[]) => void
}) {
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  const currentProfile = userProfiles[selectedProfileIndex];

  const sidebarItems = [
    { icon: Search, name: "Search", onClick: () => setView('search') },
    { icon: Home, name: "Home", onClick: () => setView('home') },
    { icon: Calendar, name: "Latest", onClick: () => {} },
    { icon: Tv, name: "TV Shows", onClick: () => {} },
    { icon: Film, name: "Movies", onClick: () => {} },
    { icon: Plus, name: "MyList", onClick: () => setView('library') },
  ];

  const mockVideos: Video[] = [
    { id: -1, title: 'The Midnight Sun', description: 'A journey into the eternal day where the sun never sets and the world is bathed in golden light.', filename: '', year: '2026', rating: 'TV-MA', duration: '1h 32m', quality: 'HD', audio: '5.1', hasSubtitles: true },
    { id: -2, title: 'Ocean Whispers', description: 'Secrets from the deep blue. Explore the hidden wonders of the underwater world.', filename: '', year: '2025', rating: 'TV-14', duration: '2h 15m', quality: '4K', audio: 'Atmos', hasSubtitles: true },
    { id: -3, title: 'Urban Jungle', description: 'Life in the concrete maze. A gritty look at the modern city and its inhabitants.', filename: '', year: '2024', rating: 'TV-MA', duration: '1h 45m', quality: 'HD', audio: '5.1', hasSubtitles: false },
    { id: -4, title: 'Desert Mirage', description: 'Finding hope in the shifting sands. A story of survival and discovery in the Sahara.', filename: '', year: '2026', rating: 'PG-13', duration: '2h 05m', quality: 'HD', audio: '5.1', hasSubtitles: true },
    { id: -5, title: 'Mountain Echo', description: 'The call of the high peaks. Scaling the world\'s most dangerous mountains.', filename: '', year: '2023', rating: 'TV-G', duration: '55m', quality: '4K', audio: '5.1', hasSubtitles: true },
    { id: -6, title: 'Neon Nights', description: 'Electric dreams in the city. A cyberpunk journey through a neon-lit future.', filename: '', year: '2026', rating: 'TV-MA', duration: '1h 20m', quality: 'HD', audio: 'Stereo', hasSubtitles: false },
    { id: -7, title: 'Arctic Flow', description: 'The silent movement of ice. Witness the majestic beauty of the frozen north.', filename: '', year: '2025', rating: 'TV-PG', duration: '1h 10m', quality: 'HD', audio: '5.1', hasSubtitles: true },
  ];

  const displayVideos = videos.length > 0 ? [...videos, ...mockVideos] : mockVideos;

  const focusedVideo = focus.area === 'trending' 
    ? displayVideos[focus.index] 
    : focus.area === 'recommended' 
      ? recommendedVideos[focus.index] 
      : focus.area === 'latest'
        ? latestVideos[focus.index]
        : null;

  const activeRowArea = focus.area === 'latest' ? 'latest' : focus.area === 'recommended' ? 'recommended' : 'trending';

  useEffect(() => {
    if (displayVideos.length > 0 && !heroVideo) {
      const randomIndex = Math.floor(Math.random() * displayVideos.length);
      setHeroVideo(displayVideos[randomIndex]);
    }
    if (displayVideos.length > 0 && recommendedVideos.length === 0) {
      const shuffled = [...displayVideos].sort(() => Math.random() - 0.5);
      setRecommendedVideos(shuffled);
    }
    if (displayVideos.length > 0 && latestVideos.length === 0) {
      const shuffled = [...displayVideos].sort(() => Math.random() - 0.7);
      setLatestVideos(shuffled);
    }
  }, [displayVideos, heroVideo, recommendedVideos, latestVideos]);

  useEffect(() => {
    if (focus.area === 'sidebar') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    }
    return () => {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    };
  }, [focus.area]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (playingVideo) return;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowRight') {
        if (focus.area === 'sidebar') {
          setFocus({ area: 'hero', index: 0 });
        } else if (focus.area === 'hero') {
          setFocus(prev => ({ ...prev, index: (prev.index + 1) % 2 }));
        } else if (focus.area === 'trending') {
          setFocus(prev => ({ ...prev, index: (prev.index + 1) % displayVideos.length }));
        } else if (focus.area === 'recommended') {
          setFocus(prev => ({ ...prev, index: (prev.index + 1) % recommendedVideos.length }));
        } else if (focus.area === 'latest') {
          setFocus(prev => ({ ...prev, index: (prev.index + 1) % latestVideos.length }));
        }
      } else if (e.key === 'ArrowLeft') {
        if (focus.area === 'sidebar') {
          // Stay in sidebar
        } else if (focus.area === 'hero') {
          if (focus.index === 0) setFocus({ area: 'sidebar', index: 2 }); // Go to Home icon (index 2 now)
          else setFocus(prev => ({ ...prev, index: 0 }));
        } else if (focus.area === 'trending') {
          if (focus.index === 0) setFocus({ area: 'sidebar', index: 3 }); // Go to Latest icon (index 3 now)
          else {
            setFocus(prev => ({ ...prev, index: (prev.index - 1 + displayVideos.length) % displayVideos.length }));
          }
        } else if (focus.area === 'recommended') {
          if (focus.index === 0) setFocus({ area: 'sidebar', index: 4 }); // Go to TV Shows icon
          else {
            setFocus(prev => ({ ...prev, index: (prev.index - 1 + recommendedVideos.length) % recommendedVideos.length }));
          }
        } else if (focus.area === 'latest') {
          if (focus.index === 0) setFocus({ area: 'sidebar', index: 5 }); // Go to Movies icon
          else {
            setFocus(prev => ({ ...prev, index: (prev.index - 1 + latestVideos.length) % latestVideos.length }));
          }
        }
      } else if (e.key === 'ArrowDown') {
        if (focus.area === 'sidebar') {
          setFocus(prev => ({ ...prev, index: (prev.index + 1) % (sidebarItems.length + 1) }));
        } else if (focus.area === 'hero') {
          setFocus({ area: 'trending', index: 0 });
        } else if (focus.area === 'trending') {
          setFocus({ area: 'recommended', index: 0 });
        } else if (focus.area === 'recommended') {
          setFocus({ area: 'latest', index: 0 });
        }
      } else if (e.key === 'ArrowUp') {
        if (focus.area === 'sidebar') {
          setFocus(prev => ({ ...prev, index: (prev.index - 1 + (sidebarItems.length + 1)) % (sidebarItems.length + 1) }));
        } else if (focus.area === 'trending') {
          setFocus({ area: 'hero', index: 0 });
        } else if (focus.area === 'recommended') {
          setFocus({ area: 'trending', index: 0 });
        } else if (focus.area === 'latest') {
          setFocus({ area: 'recommended', index: 0 });
        }
      } else if (e.key === 'Enter') {
        if (focus.area === 'sidebar') {
          if (focus.index === 0) {
            setIsLoggedIn(false);
          } else {
            sidebarItems[focus.index - 1].onClick();
          }
        } else if (focus.area === 'hero') {
          if (heroVideo) {
            setSelectedVideo(heroVideo);
            setView('details');
          }
        } else if (focus.area === 'trending') {
          setSelectedVideo(displayVideos[focus.index]);
          setView('details');
        } else if (focus.area === 'recommended') {
          setSelectedVideo(recommendedVideos[focus.index]);
          setView('details');
        } else if (focus.area === 'latest') {
          setSelectedVideo(latestVideos[focus.index]);
          setView('details');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [playingVideo, focus, displayVideos, recommendedVideos, latestVideos, heroVideo]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex overflow-x-hidden w-full">
      {/* Video Player Overlay */}
      {playingVideo && (
        <VideoPlayer video={playingVideo} onBack={() => setPlayingVideo(null)} />
      )}

      {/* Sidebar */}
      <Sidebar 
        focus={focus} 
        setFocus={setFocus} 
        activeTab="Home" 
        currentProfile={currentProfile} 
        setIsLoggedIn={setIsLoggedIn} 
        sidebarItems={sidebarItems} 
        onMouseEnter={() => setFocus(prev => ({ ...prev, area: 'sidebar' }))}
        onMouseLeave={() => {
          if (focus.area === 'sidebar') {
            setFocus(prev => ({ ...prev, area: 'hero', index: 0 }));
          }
        }}
      />

      {/* Main Content */}
      <div className="flex-1 h-screen overflow-hidden flex flex-col">
        {/* Hero Section or Mini Title Screen */}
        <div className="relative h-[75vh] shrink-0 overflow-hidden">
          <AnimatePresence mode="wait">
            {focusedVideo ? (
              <motion.div 
                key={`focused-${focusedVideo.id}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 flex items-start pt-44"
              >
                {/* Background Thumbnail on Right */}
                <img 
                  src={focusedVideo.thumbnail ? `/uploads/${focusedVideo.thumbnail}` : `https://picsum.photos/seed/${focusedVideo.id + 100}/1920/1080`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover object-right"
                  referrerPolicy="no-referrer"
                />
                {/* Gradient mask to fade out the image on the left */}
                <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950 to-transparent w-[60%] z-10" />
                <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-transparent to-zinc-950 z-10" />
                
                {/* Content on Left */}
                <div className="max-w-2xl z-20 ml-28 relative">
                  {focusedVideo.logo ? (
                    <img 
                      src={`/uploads/${focusedVideo.logo}`} 
                      alt={focusedVideo.title}
                      className="h-24 mb-4 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <img 
                      src={PLACEHOLDER_SVG} 
                      alt="Placeholder Logo"
                      className="h-24 mb-4 object-contain"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  
                  {/* Metadata Row */}
                  <div className="flex items-center gap-4 text-sm font-bold text-zinc-400 mb-6">
                    <span>{focusedVideo.year}</span>
                    <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[11px] border border-zinc-700">{focusedVideo.rating}</span>
                    <span>{focusedVideo.duration}</span>
                    <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] leading-none font-black">{focusedVideo.quality}</span>
                    <div className="flex items-center gap-1.5">
                      <AudioLines size={16} className="text-zinc-500" />
                      <span className="text-[11px]">{focusedVideo.audio}</span>
                    </div>
                    {!!focusedVideo.hasAD && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] border border-zinc-600 px-1 rounded">AD</span>
                        <MessageSquareText size={16} className="text-zinc-500" />
                      </div>
                    )}
                    {focusedVideo.hasSubtitles ? <Subtitles size={16} className="text-zinc-500" /> : null}
                  </div>

                  <p className="text-xl text-zinc-200 leading-tight max-w-lg font-medium">
                    {focusedVideo.description}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="hero-main"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0"
              >
                <img 
                  src={heroVideo?.thumbnail ? `/uploads/${heroVideo.thumbnail}` : `https://picsum.photos/seed/${heroVideo?.id || 'default'}/1920/1080`}
                  alt=""
                  className="absolute inset-0 w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                {/* Gradient Overlays */}
                <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-zinc-950/80 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-zinc-950 to-transparent" />
                
                <div className="absolute inset-0 flex items-end pb-48 pt-16">
                  <div className="max-w-xl z-10 ml-28 relative">
                    {heroVideo?.logo ? (
                      <img 
                        src={`/uploads/${heroVideo.logo}`} 
                        alt={heroVideo.title}
                        className="h-24 mb-4 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <h1 className="text-6xl font-bold mb-4">{heroVideo?.title || 'Stranger Things'}</h1>
                    )}
                    <p className="text-lg mb-6 line-clamp-3">{heroVideo?.description || 'When a young boy vanishes, a small town uncovers a mystery involving secret experiments, terrifying supernatural forces and one strange little girl.'}</p>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => {
                          if (heroVideo) {
                            setSelectedVideo(heroVideo);
                            setView('details');
                          }
                        }}
                        onMouseEnter={() => setFocus({ area: 'hero', index: 0 })}
                        className={`px-8 py-2 rounded font-bold flex items-center gap-2 transition-all group ${
                          focus.area === 'hero' && focus.index === 0 
                            ? 'bg-white text-black scale-105 ring-4 ring-white/50' 
                            : 'bg-zinc-500/50 text-white hover:bg-white hover:text-black'
                        }`}
                      >
                        <Play 
                          size={20} 
                          fill={focus.area === 'hero' && focus.index === 0 ? "black" : "white"} 
                          className={focus.area === 'hero' && focus.index === 0 ? "" : "group-hover:fill-black transition-colors"}
                        /> Play
                      </button>
                      <button 
                        onClick={() => {
                          if (heroVideo) {
                            setSelectedVideo(heroVideo);
                            setView('details');
                          }
                        }}
                        onMouseEnter={() => setFocus({ area: 'hero', index: 1 })}
                        className={`px-8 py-2 rounded font-bold transition-all ${
                          focus.area === 'hero' && focus.index === 1 
                            ? 'bg-white text-black scale-105 ring-4 ring-white/50' 
                            : 'bg-zinc-500/50 text-white hover:bg-white hover:text-black'
                        }`}
                      >
                        More Info
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Rows Area */}
        <div className="flex-1 relative z-20 -mt-32">
          <motion.div 
            animate={{ 
              y: (focus.area === 'latest' ? -760 : focus.area === 'recommended' ? -380 : 0) + 
                 (focus.area !== 'hero' && focus.area !== 'sidebar' ? -200 : 0)
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="relative"
          >
            {/* Trending Now */}
            <div 
              className={`h-[380px] py-4 pl-28 bg-transparent max-w-full overflow-hidden transition-opacity duration-500 ${focus.area !== 'trending' && focus.area !== 'hero' ? 'opacity-0' : 'opacity-100'}`}
              onMouseLeave={() => setFocus({ area: 'hero', index: 0 })}
            >
              <h2 className="text-2xl font-bold mb-4">Trending Now</h2>
              <div className="relative">
                {/* Fixed Selection Box */}
                <div className={`absolute left-0 top-8 w-48 aspect-[5/7] ring-4 ring-white z-30 pointer-events-none transition-opacity duration-300 ${focus.area === 'trending' ? 'opacity-100' : 'opacity-0'}`} />
                
                <div 
                  className="flex gap-2 py-8 transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${focus.area === 'trending' ? focus.index * 200 : 0}px)` }}
                >
                  {displayVideos.map((video, i) => (
                    <button 
                      key={video.id} 
                      id={`video-${i}`}
                      onClick={() => {
                        setSelectedVideo(video);
                        setView('details');
                      }}
                      onMouseEnter={() => setFocus({ area: 'trending', index: i })}
                      className="flex-shrink-0 w-48 aspect-[5/7] bg-zinc-800 flex flex-col items-center justify-center group relative overflow-hidden transition-all origin-center"
                    >
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                      {video.thumbnail && (
                        <img src={`/uploads/${video.thumbnail}`} alt={video.title} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommended for You */}
            <div 
              className={`h-[380px] py-4 pl-28 bg-transparent max-w-full overflow-hidden transition-opacity duration-500 ${focus.area === 'latest' ? 'opacity-0' : 'opacity-100'}`}
              onMouseLeave={() => setFocus({ area: 'hero', index: 0 })}
            >
              <h2 className="text-2xl font-bold mb-4">Recommended for You</h2>
              <div className="relative">
                {/* Fixed Selection Box */}
                <div className={`absolute left-0 top-8 w-48 aspect-[5/7] ring-4 ring-white z-30 pointer-events-none transition-opacity duration-300 ${focus.area === 'recommended' ? 'opacity-100' : 'opacity-0'}`} />
                
                <div 
                  className="flex gap-2 py-8 transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${focus.area === 'recommended' ? focus.index * 200 : 0}px)` }}
                >
                  {recommendedVideos.map((video, i) => (
                    <button 
                      key={`rec-${video.id}`} 
                      onClick={() => {
                        setSelectedVideo(video);
                        setView('details');
                      }}
                      onMouseEnter={() => setFocus({ area: 'recommended', index: i })}
                      className="flex-shrink-0 w-48 aspect-[5/7] bg-zinc-800 flex flex-col items-center justify-center group relative overflow-hidden transition-all origin-center"
                    >
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                      {video.thumbnail && (
                        <img src={`/uploads/${video.thumbnail}`} alt={video.title} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* New Releases */}
            <div 
              className="h-[380px] py-4 pl-28 bg-transparent max-w-full overflow-hidden"
              onMouseLeave={() => setFocus({ area: 'hero', index: 0 })}
            >
              <h2 className="text-2xl font-bold mb-4">New Releases</h2>
              <div className="relative">
                {/* Fixed Selection Box */}
                <div className={`absolute left-0 top-8 w-48 aspect-[5/7] ring-4 ring-white z-30 pointer-events-none transition-opacity duration-300 ${focus.area === 'latest' ? 'opacity-100' : 'opacity-0'}`} />
                
                <div 
                  className="flex gap-2 py-8 transition-transform duration-500 ease-out"
                  style={{ transform: `translateX(-${focus.area === 'latest' ? focus.index * 200 : 0}px)` }}
                >
                  {latestVideos.map((video, i) => (
                    <button 
                      key={`latest-${video.id}`} 
                      onClick={() => {
                        setSelectedVideo(video);
                        setView('details');
                      }}
                      onMouseEnter={() => setFocus({ area: 'latest', index: i })}
                      className="flex-shrink-0 w-48 aspect-[5/7] bg-zinc-800 flex flex-col items-center justify-center group relative overflow-hidden transition-all origin-center"
                    >
                      <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-colors" />
                      {video.thumbnail && (
                        <img src={`/uploads/${video.thumbnail}`} alt={video.title} className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function VideoPlayer({ video, onBack }: { video: Video, onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [showPauseOverlay, setShowPauseOverlay] = useState(false);
  const [isSeeking, setIsSeeking] = useState(false);
  const [originalTime, setOriginalTime] = useState(0);
  const [focus, setFocus] = useState({ row: 1, index: 0 }); // 0: Top, 1: Bottom (0: Play, 1: Progress)
  const controlsTimerRef = useRef<NodeJS.Timeout | null>(null);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    
    // Only hide controls if the video is playing
    if (videoRef.current && !videoRef.current.paused) {
      controlsTimerRef.current = setTimeout(() => {
        setShowControls(false);
      }, 5000);
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPaused) {
      setShowControls(true);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
      
      timer = setTimeout(() => {
        setShowPauseOverlay(true);
      }, 5000);
    } else {
      setShowPauseOverlay(false);
      resetTimer();
    }
    return () => clearTimeout(timer);
  }, [isPaused]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (videoRef.current.paused) videoRef.current.play();
      else videoRef.current.pause();
    }
  };

  const restartVideo = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  useEffect(() => {
    resetTimer();
    const handleMouseMove = () => resetTimer();
    const handleKeyDown = (e: KeyboardEvent) => {
      const wasHidden = !showControls;

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter', ' ', 'Escape'].includes(e.key)) {
        resetTimer();
        if (wasHidden && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
          setFocus({ row: 1, index: 0 });
          setShowControls(true);
          return;
        }
      }

      if (isSeeking) {
        if (e.key === 'ArrowLeft') {
          if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
          return;
        }
        if (e.key === 'ArrowRight') {
          if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 5);
          return;
        }
        if (e.key === 'Enter') {
          setIsSeeking(false);
          videoRef.current?.play();
          return;
        }
        if (e.key === 'Escape') {
          if (videoRef.current) videoRef.current.currentTime = originalTime;
          setIsSeeking(false);
          videoRef.current?.play();
          return;
        }
        return;
      }

      if (e.key === 'ArrowRight') {
        if (focus.row === 0) {
          setFocus(prev => ({ ...prev, index: Math.min(prev.index + 1, 2) }));
        } else if (focus.row === 1) {
          setFocus(prev => ({ ...prev, index: Math.min(prev.index + 1, 1) }));
        }
      } else if (e.key === 'ArrowLeft') {
        if (focus.row === 0) {
          setFocus(prev => ({ ...prev, index: Math.max(prev.index - 1, 0) }));
        } else if (focus.row === 1) {
          setFocus(prev => ({ ...prev, index: Math.max(prev.index - 1, 0) }));
        }
      } else if (e.key === 'ArrowDown') {
        if (focus.row === 0) {
          if (focus.index === 0) setFocus({ row: 1, index: 0 });
          else setFocus({ row: 1, index: 1 });
        }
      } else if (e.key === 'ArrowUp') {
        if (focus.row === 1) {
          if (focus.index === 0) setFocus({ row: 0, index: 0 });
          else setFocus({ row: 0, index: 2 });
        }
      } else if (e.key === 'Enter') {
        if (focus.row === 0) {
          if (focus.index === 0) onBack();
          else if (focus.index === 2) restartVideo();
        } else if (focus.row === 1) {
          if (focus.index === 0) {
            togglePlay();
          } else {
            if (videoRef.current) {
              setOriginalTime(videoRef.current.currentTime);
              videoRef.current.pause();
              setIsSeeking(true);
            }
          }
        }
      } else if (e.key === ' ') {
        togglePlay();
      } else if (e.key === 'Escape') {
        if (showControls) {
          setShowControls(false);
        } else {
          onBack();
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    };
  }, [focus, onBack, isSeeking, originalTime, duration, showControls]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  return (
    <div className={`fixed inset-0 z-50 bg-black flex flex-col ${showControls ? 'cursor-default' : 'cursor-none'}`} onMouseMove={resetTimer}>
      <video 
        ref={videoRef}
        src={video.filename ? `/uploads/${video.filename}` : `https://www.w3schools.com/html/mov_bbb.mp4`} 
        className="w-full h-full object-contain" 
        autoPlay 
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onPlay={() => setIsPaused(false)}
        onPause={() => setIsPaused(true)}
        onClick={() => {
          togglePlay();
          resetTimer();
        }}
      />

      {/* Pause Overlay */}
      <AnimatePresence>
        {showPauseOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="absolute inset-0 bg-black/75 z-0 flex items-center pointer-events-none"
          >
            <div className="pl-14 flex flex-col gap-2">
              <img 
                src={video.logo ? `/uploads/${video.logo}` : `https://picsum.photos/seed/${video.id + 500}/400/200`} 
                alt={video.title}
                className="h-24 object-contain object-left"
                referrerPolicy="no-referrer"
              />
              <p className="text-xs font-bold text-zinc-400 uppercase tracking-widest ml-1">
                {video.title}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showControls && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-10 flex flex-col justify-between pt-12 px-12 pb-6 pointer-events-none"
          >
            {/* Top Controls - Moved higher */}
            <div className="flex items-center gap-8 pointer-events-auto -mt-6">
              <button 
                onClick={onBack}
                onMouseEnter={() => setFocus({ row: 0, index: 0 })}
                className={`p-2 transition-all duration-200 ${focus.row === 0 && focus.index === 0 ? 'bg-white/30 scale-110 rounded-full' : 'hover:bg-white/20'}`}
                title="Back"
              >
                <ArrowLeft size={48} strokeWidth={1.5} />
              </button>
              <button 
                onMouseEnter={() => setFocus({ row: 0, index: 1 })}
                className={`p-2 transition-all duration-200 ${focus.row === 0 && focus.index === 1 ? 'bg-white/30 scale-110 rounded-full' : 'hover:bg-white/20'}`}
                title="Captions"
              >
                <Subtitles size={48} strokeWidth={1.5} />
              </button>
              <button 
                onClick={restartVideo}
                onMouseEnter={() => setFocus({ row: 0, index: 2 })}
                className={`p-2 transition-all duration-200 relative ${focus.row === 0 && focus.index === 2 ? 'bg-white/30 scale-110 rounded-full' : 'hover:bg-white/20'}`}
                title="Restart"
              >
                <RotateCcw size={48} strokeWidth={1.5} />
                <Play size={16} fill="white" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ml-0.5" />
              </button>
            </div>

            {/* Bottom Controls */}
            <div className="w-full pointer-events-auto flex items-center gap-3">
              {/* Play/Pause Button */}
              <button 
                onClick={togglePlay}
                onMouseEnter={() => setFocus({ row: 1, index: 0 })}
                className={`w-16 h-16 rounded-full flex items-center justify-center shrink-0 transition-all duration-200 shadow-lg mr-3 ${
                  focus.row === 1 && focus.index === 0
                    ? 'bg-white text-black scale-110' 
                    : 'text-white hover:bg-white/10'
                }`}
              >
                {isPaused ? (
                  <Play size={32} fill={focus.row === 1 && focus.index === 0 ? "black" : "white"} className="ml-1" />
                ) : (
                  <Pause size={32} fill={focus.row === 1 && focus.index === 0 ? "black" : "white"} />
                )}
              </button>

              {/* Time Progressed */}
              <span className="text-2xl font-sf-pro font-light min-w-[100px] text-center text-white tracking-tight">
                {formatTime(currentTime)}
              </span>

              {/* Progress Bar */}
              <div 
                className={`transition-all duration-300 relative flex-1 flex items-center ${
                  focus.row === 1 && focus.index === 1 ? (isSeeking ? 'h-6' : 'h-4') : 'h-2'
                }`}
                onMouseEnter={() => setFocus({ row: 1, index: 1 })}
              >
                <div className="w-full h-full bg-zinc-800 relative overflow-hidden rounded-full">
                  <div 
                    className="h-full bg-red-600 relative transition-all duration-100" 
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  >
                    {/* Progress Handle */}
                    <div className={`absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 bg-white rounded-full shadow-md transition-all ${
                      focus.row === 1 && focus.index === 1 ? (isSeeking ? 'w-6 h-6' : 'w-4 h-4') : 'w-0 h-0'
                    }`} />
                  </div>
                </div>
              </div>

              {/* Time Remaining */}
              <span className="text-2xl font-sf-pro font-light min-w-[100px] text-center text-white tracking-tight">
                {formatTime(Math.max(0, duration - currentTime))}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DetailsView({ video, setView, setSelectedVideo }: { 
  video: Video, 
  setView: (view: 'selection' | 'home' | 'library' | 'details' | 'search') => void,
  setSelectedVideo: (video: Video | null) => void
}) {
  const [focusIndex, setFocusIndex] = useState(1); // Default to Play (index 1)
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  const menuItems = [
    { icon: ThumbsUp, label: "Rate This Title", action: () => {} },
    { icon: Play, label: "Play", action: () => setPlayingVideo(video) },
    { icon: Play, label: "Play Trailer", action: () => {
      // Use trailer if available, otherwise default to main video
      const trailerVideo = video.trailer ? { ...video, filename: video.trailer } : video;
      setPlayingVideo(trailerVideo);
    } },
    { icon: Subtitles, label: "Audio & Subtitles", action: () => {} },
    { icon: Plus, label: "Add to My List", action: () => {} },
  ];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (playingVideo) return;

      if (e.key === 'ArrowDown') {
        setFocusIndex(prev => (prev + 1) % menuItems.length);
      } else if (e.key === 'ArrowUp') {
        setFocusIndex(prev => (prev - 1 + menuItems.length) % menuItems.length);
      } else if (e.key === 'Enter') {
        menuItems[focusIndex].action();
      } else if (e.key === 'Escape' || e.key === 'Backspace') {
        setView('home');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focusIndex, playingVideo, video, setView]);

  return (
    <div className="min-h-screen bg-zinc-950 text-white relative overflow-hidden flex flex-col">
      {/* Video Player Overlay */}
      {playingVideo && (
        <VideoPlayer video={playingVideo} onBack={() => setPlayingVideo(null)} />
      )}

      {/* Background Hero Image */}
      <div className="absolute inset-0 flex items-start pt-20">
        <img 
          src={video.thumbnail ? `/uploads/${video.thumbnail}` : `https://picsum.photos/seed/${video.id + 100}/1920/1080`}
          alt=""
          className="absolute inset-0 w-full h-full object-cover object-right opacity-60"
          referrerPolicy="no-referrer"
        />
        {/* Gradient mask */}
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/90 to-transparent w-[70%] z-10" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/20 to-zinc-950 z-10" />
      </div>

      {/* Content Section */}
      <div className="relative z-20 flex-1 flex flex-col justify-center px-28 pt-12">
        <div className="max-w-2xl">
          {/* Logo or Title */}
          <div className="mb-2">
            <span className="text-red-600 font-black tracking-tighter text-xl uppercase">Netflix</span>
          </div>
          
          {video.logo ? (
            <img 
              src={`/uploads/${video.logo}`} 
              alt={video.title}
              className="h-24 mb-4 object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <h1 className="text-6xl font-black mb-4 uppercase tracking-tight">{video.title}</h1>
          )}

          {/* Metadata Row */}
          <div className="flex items-center gap-4 text-sm font-bold text-zinc-400 mb-6">
            <span>{video.year || '2026'}</span>
            <span className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-[11px] border border-zinc-700">{video.rating || 'TV-MA'}</span>
            <span>{video.duration || '1h 32m'}</span>
            <span className="px-1.5 py-0.5 border border-zinc-600 rounded text-[10px] leading-none font-black">{video.quality || 'HD'}</span>
            <div className="flex items-center gap-1.5">
              <AudioLines size={16} className="text-zinc-500" />
              <span className="text-[11px]">{video.audio || '5.1'}</span>
            </div>
            {!!video.hasAD && (
              <div className="flex items-center gap-1">
                <span className="text-[10px] border border-zinc-600 px-1 rounded">AD</span>
                <MessageSquareText size={16} className="text-zinc-500" />
              </div>
            )}
            {video.hasSubtitles ? <Subtitles size={16} className="text-zinc-500" /> : null}
          </div>

          <h3 className="text-xl font-bold mb-4 text-white">Watch {video.title} Now</h3>

          <p className="text-lg text-zinc-300 leading-snug max-w-xl mb-6 font-medium">
            {video.description || "No description available for this title. Experience the thrill and excitement of this exclusive reunion special."}
          </p>

          <p className="text-sm text-zinc-500 mb-8">
            Cast: <span className="text-zinc-400">Nick Lachey, Vanessa Lachey</span>
          </p>

          {/* Action Menu */}
          <div className="flex flex-col gap-2 w-72">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.action}
                onMouseEnter={() => setFocusIndex(index)}
                className={`flex items-center gap-4 px-4 py-2 rounded transition-all duration-200 text-left ${
                  focusIndex === index 
                    ? 'bg-white text-black scale-105 shadow-xl' 
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                <item.icon size={20} fill={focusIndex === index ? "black" : "none"} />
                <span className="font-bold text-lg">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchView({ 
  videos, 
  setView, 
  selectedProfileIndex, 
  userProfiles,
  setIsLoggedIn,
  setSelectedVideo
}: { 
  videos: Video[], 
  setView: (view: 'selection' | 'home' | 'library' | 'details' | 'search') => void,
  selectedProfileIndex: number,
  userProfiles: Profile[],
  setIsLoggedIn: (loggedIn: boolean) => void,
  setSelectedVideo: (video: Video | null) => void
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [focus, setFocus] = useState<{ area: 'sidebar' | 'keyboard' | 'autocomplete' | 'results', index: number, subIndex?: number }>({ area: 'keyboard', index: 0, subIndex: 0 });
  
  const currentProfile = userProfiles[selectedProfileIndex];

  const sidebarItems = [
    { icon: Search, name: "Search", onClick: () => setView('search') },
    { icon: Home, name: "Home", onClick: () => setView('home') },
    { icon: Calendar, name: "Latest", onClick: () => {} },
    { icon: Tv, name: "TV Shows", onClick: () => {} },
    { icon: Film, name: "Movies", onClick: () => {} },
    { icon: Plus, name: "MyList", onClick: () => setView('library') },
  ];

  const KEYBOARD_ROWS = [
    ['SPACE', 'BACKSPACE'],
    ['a', 'b', 'c', 'd', 'e', 'f'],
    ['g', 'h', 'i', 'j', 'k', 'l'],
    ['m', 'n', 'o', 'p', 'q', 'r'],
    ['s', 't', 'u', 'v', 'w', 'x'],
    ['y', 'z', '1', '2', '3', '4'],
    ['5', '6', '7', '8', '9', '0']
  ];

  const filteredVideos = videos.filter(v => 
    v.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const autocompleteOptions = searchQuery.length > 0 
    ? filteredVideos.slice(0, 5).map(v => v.title)
    : [];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
      }

      if (e.key === 'ArrowRight') {
        if (focus.area === 'sidebar') {
          setFocus({ area: 'keyboard', index: 0, subIndex: 0 });
        } else if (focus.area === 'keyboard') {
          const currentRow = KEYBOARD_ROWS[focus.index];
          if (focus.subIndex! < currentRow.length - 1) {
            setFocus(prev => ({ ...prev, subIndex: prev.subIndex! + 1 }));
          } else if (filteredVideos.length > 0) {
            setFocus({ area: 'results', index: 0 });
          }
        } else if (focus.area === 'autocomplete') {
          if (filteredVideos.length > 0) {
            setFocus({ area: 'results', index: 0 });
          }
        } else if (focus.area === 'results') {
          if (focus.index < filteredVideos.length - 1) {
            setFocus(prev => ({ ...prev, index: prev.index + 1 }));
          }
        }
      } else if (e.key === 'ArrowLeft') {
        if (focus.area === 'keyboard') {
          if (focus.subIndex! > 0) {
            setFocus(prev => ({ ...prev, subIndex: prev.subIndex! - 1 }));
          } else {
            setFocus({ area: 'sidebar', index: 1 }); // Focus Search icon
          }
        } else if (focus.area === 'autocomplete') {
          setFocus({ area: 'sidebar', index: 1 });
        } else if (focus.area === 'results') {
          if (focus.index % 4 === 0) {
            setFocus({ area: 'keyboard', index: 0, subIndex: 1 });
          } else {
            setFocus(prev => ({ ...prev, index: prev.index - 1 }));
          }
        }
      } else if (e.key === 'ArrowDown') {
        if (focus.area === 'sidebar') {
          setFocus(prev => ({ ...prev, index: Math.min(prev.index + 1, sidebarItems.length) }));
        } else if (focus.area === 'keyboard') {
          if (focus.index < KEYBOARD_ROWS.length - 1) {
            setFocus(prev => ({ ...prev, index: prev.index + 1, subIndex: Math.min(prev.subIndex!, KEYBOARD_ROWS[prev.index + 1].length - 1) }));
          } else if (autocompleteOptions.length > 0) {
            setFocus({ area: 'autocomplete', index: 0 });
          }
        } else if (focus.area === 'autocomplete') {
          if (focus.index < autocompleteOptions.length - 1) {
            setFocus(prev => ({ ...prev, index: prev.index + 1 }));
          }
        } else if (focus.area === 'results') {
          if (focus.index + 4 < filteredVideos.length) {
            setFocus(prev => ({ ...prev, index: prev.index + 4 }));
          }
        }
      } else if (e.key === 'ArrowUp') {
        if (focus.area === 'sidebar') {
          setFocus(prev => ({ ...prev, index: Math.max(prev.index - 1, 0) }));
        } else if (focus.area === 'keyboard') {
          if (focus.index > 0) {
            setFocus(prev => ({ ...prev, index: prev.index - 1, subIndex: Math.min(prev.subIndex!, KEYBOARD_ROWS[prev.index - 1].length - 1) }));
          }
        } else if (focus.area === 'autocomplete') {
          setFocus({ area: 'keyboard', index: KEYBOARD_ROWS.length - 1, subIndex: 0 });
        } else if (focus.area === 'results') {
          if (focus.index >= 4) {
            setFocus(prev => ({ ...prev, index: prev.index - 4 }));
          } else {
            setFocus({ area: 'keyboard', index: 0, subIndex: 1 });
          }
        }
      } else if (e.key === 'Enter') {
        if (focus.area === 'sidebar') {
          if (focus.index === 0) setIsLoggedIn(false);
          else sidebarItems[focus.index - 1].onClick();
        } else if (focus.area === 'keyboard') {
          const key = KEYBOARD_ROWS[focus.index][focus.subIndex!];
          if (key === 'SPACE') setSearchQuery(prev => prev + " ");
          else if (key === 'BACKSPACE') setSearchQuery(prev => prev.slice(0, -1));
          else setSearchQuery(prev => prev + key);
        } else if (focus.area === 'autocomplete') {
          setSearchQuery(autocompleteOptions[focus.index]);
        } else if (focus.area === 'results') {
          setSelectedVideo(filteredVideos[focus.index]);
          setView('details');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [focus, searchQuery, filteredVideos, autocompleteOptions]);

  return (
    <div className="flex h-screen bg-black text-white overflow-hidden relative">
      <Sidebar 
        focus={focus} 
        setFocus={setFocus} 
        activeTab="Search" 
        currentProfile={currentProfile} 
        setIsLoggedIn={setIsLoggedIn} 
        sidebarItems={sidebarItems} 
        onMouseEnter={() => setFocus(prev => ({ ...prev, area: 'sidebar' }))}
        onMouseLeave={() => {
          if (focus.area === 'sidebar') {
            setFocus(prev => ({ ...prev, area: 'keyboard', index: 0, subIndex: 0 }));
          }
        }}
      />

      <div className="flex-1 flex flex-col p-12 pl-32 overflow-hidden">
        <div className="flex gap-12 mb-12">
          {/* Keyboard Section */}
          <div className="w-80 shrink-0">
            <div className="p-4">
              <div className="grid gap-2">
                {KEYBOARD_ROWS.map((row, rowIndex) => (
                  <div key={rowIndex} className="flex gap-2">
                    {row.map((key, colIndex) => {
                      const isFocused = focus.area === 'keyboard' && focus.index === rowIndex && focus.subIndex === colIndex;
                      const isWide = key === 'SPACE' || key === 'BACKSPACE';
                      return (
                        <button
                          key={colIndex}
                          className={`h-10 flex items-center justify-center rounded transition-all duration-200 font-bold text-sm ${
                            isWide ? 'flex-1' : 'w-10'
                          } ${
                            isFocused 
                              ? 'bg-white text-black scale-110 shadow-xl z-10' 
                              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                          }`}
                        >
                          {key === 'SPACE' ? 'SPACE' : key === 'BACKSPACE' ? 'DEL' : key}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Autocomplete Section */}
            <div className="mt-8 space-y-2">
              {autocompleteOptions.map((option, index) => {
                const isFocused = focus.area === 'autocomplete' && focus.index === index;
                return (
                  <div 
                    key={index}
                    className={`px-4 py-2 rounded transition-all duration-200 truncate ${
                      isFocused ? 'bg-white/10 text-white font-bold' : 'text-zinc-500'
                    }`}
                  >
                    {option}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Search Bar and Results */}
          <div className="flex-1 flex flex-col min-w-0">
            <div className="flex items-center gap-4 mb-8 p-4">
              <Search size={24} className="text-zinc-500" />
              <div className="text-3xl font-light tracking-tight">
                {searchQuery || <span className="text-zinc-700 italic">Search titles...</span>}
                <motion.span 
                  animate={{ opacity: [1, 0] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="inline-block w-0.5 h-8 bg-red-600 ml-1 align-middle"
                />
              </div>
            </div>

            {/* Results Grid */}
            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
              {filteredVideos.length > 0 ? (
                <div className="grid grid-cols-4 gap-[13.5px]">
                  {filteredVideos.map((video, index) => {
                    const isFocused = focus.area === 'results' && focus.index === index;
                    return (
                      <motion.button
                        key={video.id}
                        layout
                        onMouseEnter={() => setFocus({ area: 'results', index })}
                        onClick={() => {
                          setSelectedVideo(video);
                          setView('details');
                        }}
                        className={`relative aspect-[2/3] rounded-none transition-all duration-300 outline-none ${
                          isFocused ? 'ring-4 ring-white z-10 shadow-2xl shadow-black' : 'opacity-60 hover:opacity-100'
                        }`}
                      >
                        {video.thumbnail ? (
                          <img 
                            src={`/uploads/${video.thumbnail}`} 
                            alt={video.title} 
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800 flex items-center justify-center p-4 text-center">
                            <span className="text-xs font-bold text-zinc-500">{video.title}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity flex items-end p-4">
                          <p className="text-xs font-bold truncate w-full">{video.title}</p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : searchQuery.length > 0 ? (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-600">
                  <Search size={48} className="mb-4 opacity-20" />
                  <p className="text-xl font-medium">No results found for "{searchQuery}"</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 text-zinc-700">
                  <p className="text-xl font-medium italic">Start typing to search titles</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
