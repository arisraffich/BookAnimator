const { useState, useEffect } = React;

// --- Helper Components ---
const Button = ({ onClick, children, disabled = false, className = '', variant = 'primary' }) => {
  const baseClasses = 'flex items-center justify-center gap-2 px-4 py-2 font-semibold rounded-lg shadow-md transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900';
  const variants = {
    primary: 'text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500',
    secondary: 'text-gray-200 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-500',
    danger: 'text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400',
    warning: 'bg-yellow-600/20 hover:bg-yellow-600/40 text-yellow-300'
  };
  return (
    React.createElement('button', { onClick, disabled, className: `${baseClasses} ${variants[variant]} ${className}` }, children)
  );
};

const ConfirmationModal = ({ project, onConfirm, onCancel }) => {
    if (!project) return null;
    return (
        React.createElement('div', { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" },
            React.createElement('div', { className: "bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4" },
                React.createElement('div', { className: "flex items-center gap-4 mb-4" },
                    React.createElement('div', { className: "flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20" },
                        React.createElement('span', { className: "text-red-400 text-xl" }, "⚠️")
                    ),
                    React.createElement('div', null,
                        React.createElement('h3', { className: "text-lg font-bold text-white" }, "Delete Project"),
                        React.createElement('p', { className: "text-sm text-gray-400" }, `Are you sure you want to delete "${project.name}"? This action cannot be undone.`)
                    )
                ),
                React.createElement('div', { className: "flex justify-end gap-3 mt-6" },
                    React.createElement(Button, { onClick: onCancel, variant: "secondary" }, "Cancel"),
                    React.createElement(Button, { onClick: onConfirm, variant: "danger" }, "Delete")
                )
            )
        )
    );
};

// --- Main App: Manages Views (Dashboard vs. Workspace) ---
function App() {
  const [projects, setProjects] = useState([]);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

  // Load projects from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('animation-projects');
      if (saved) {
        setProjects(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }, []);

  // Save projects to localStorage whenever projects change
  useEffect(() => {
    try {
      localStorage.setItem('animation-projects', JSON.stringify(projects));
    } catch (error) {
      console.error('Error saving projects:', error);
    }
  }, [projects]);

  const createNewProject = () => {
    const newProject = {
      id: `proj_${Date.now()}`,
      name: 'Untitled Project',
      author: 'Unknown Author',
      storyText: '',
      totalPages: 0,
      scenes: {},
      createdAt: new Date().toISOString(),
    };
    setProjects(prev => [...prev, newProject]);
    setCurrentProjectId(newProject.id);
  };

  const confirmDeleteProject = () => {
      if (projectToDelete) {
          setProjects(prev => prev.filter(p => p.id !== projectToDelete.id));
          setProjectToDelete(null);
      }
  };
  
  const updateProject = (projectId, updatedData) => {
    setProjects(prev => prev.map(p => p.id === projectId ? { ...p, ...updatedData } : p));
  };

  const currentProject = projects.find(p => p.id === currentProjectId);

  if (currentProjectId && currentProject) {
    return (
      React.createElement(ProjectWorkspace, {
        project: currentProject,
        updateProject: updateProject,
        goToDashboard: () => setCurrentProjectId(null),
      })
    );
  }

  return (
    React.createElement(React.Fragment, null,
        React.createElement(ConfirmationModal, { 
            project: projectToDelete, 
            onConfirm: confirmDeleteProject, 
            onCancel: () => setProjectToDelete(null) 
        }),
        React.createElement(ProjectsDashboard, {
          projects: projects,
          createNewProject: createNewProject,
          deleteProject: (project) => setProjectToDelete(project),
          selectProject: setCurrentProjectId,
        })
    )
  );
}

// --- Projects Dashboard View ---
const ProjectsDashboard = ({ projects, createNewProject, deleteProject, selectProject }) => (
  React.createElement('div', { className: "min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8" },
    React.createElement('div', { className: "max-w-4xl mx-auto" },
      React.createElement('header', { className: "text-center mb-8" },
        React.createElement('h1', { className: "text-4xl sm:text-5xl font-extrabold text-white tracking-tight" }, "Animation Studio"),
        React.createElement('p', { className: "mt-4 text-lg text-gray-400" }, "Your projects are saved in your browser.")
      ),
      React.createElement('div', { className: "mb-8" },
        React.createElement(Button, { onClick: createNewProject }, 
            React.createElement('span', null, "➕"), " New Project"
        )
      ),
      React.createElement('div', { className: "space-y-4" },
        projects.length > 0 ? projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(p => (
          React.createElement('div', { key: p.id, className: "bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex justify-between items-center" },
            React.createElement('div', null,
              React.createElement('h2', { className: "text-xl font-bold text-white" }, p.name),
              React.createElement('p', { className: "text-sm text-gray-400" }, `By ${p.author} | ${p.totalPages} Pages`)
            ),
            React.createElement('div', { className: "flex gap-2" },
              React.createElement(Button, { onClick: () => selectProject(p.id), variant: "secondary" }, "Open"),
              React.createElement(Button, { onClick: () => deleteProject(p), variant: "danger" }, React.createElement('span', null, "🗑️"))
            )
          )
        )) : (
          React.createElement('p', { className: "text-center text-gray-500" }, "No projects yet. Click \"New Project\" to start!")
        )
      )
    )
  )
);

// --- Project Workspace View ---
const ProjectWorkspace = ({ project, updateProject, goToDashboard }) => {
    const [currentSceneId, setCurrentSceneId] = useState('cover');
    const [error, setError] = useState('');
    
    useEffect(() => {
        if (project.storyText && project.scenes[currentSceneId]?.status !== 'completed') {
            const navItems = ['cover', ...Array.from({ length: project.totalPages }, (_, i) => String(i + 1)), 'end'];
            const firstPendingScene = navItems.find(id => !project.scenes[id] || project.scenes[id].status !== 'completed');
            if (firstPendingScene && firstPendingScene !== currentSceneId) {
                setCurrentSceneId(firstPendingScene);
            }
        }
    }, [project.scenes, project.storyText, project.totalPages, currentSceneId]);

    return (
        React.createElement('div', { className: "min-h-screen bg-gray-900 text-gray-200 font-sans flex" },
            React.createElement(PageNavigation, { project: project, currentSceneId: currentSceneId, setCurrentSceneId: setCurrentSceneId, goToDashboard: goToDashboard }),
            React.createElement('main', { className: "flex-1 p-8 overflow-y-auto" },
                 React.createElement('header', { className: "mb-8 flex justify-between items-start" },
                    React.createElement('div', null,
                        React.createElement('h1', { className: "text-3xl font-bold text-white" }, project.name),
                        React.createElement('p', { className: "text-md text-gray-400" }, `By: ${project.author}`)
                    )
                 ),
                 error && (
                    React.createElement('div', { className: "w-full bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-4" },
                        React.createElement('p', null, React.createElement('span', { className: "font-bold" }, "Error: "), error)
                    )
                ),
                React.createElement(SceneGenerator, { project: project, updateProject: updateProject, currentSceneId: currentSceneId, setCurrentSceneId: setCurrentSceneId, setError: setError })
            )
        )
    );
};

// --- Page Navigation Sidebar ---
const PageNavigation = ({ project, currentSceneId, setCurrentSceneId, goToDashboard }) => {
    const navItems = project.totalPages > 0 ? ['cover', ...Array.from({ length: project.totalPages }, (_, i) => String(i + 1)), 'end'] : [];
    
    const firstPendingSceneIndex = navItems.findIndex(id => !project.scenes[id] || project.scenes[id].status !== 'completed');

    return (
        React.createElement('nav', { className: "w-64 bg-gray-900/50 border-r border-gray-800 p-4 flex flex-col" },
            React.createElement(Button, { onClick: goToDashboard, variant: "secondary", className: "mb-6" }, React.createElement('span', null, "🏠"), " Dashboard"),
            navItems.length > 0 && React.createElement('h3', { className: "text-lg font-semibold text-white mb-4" }, "Project Pages"),
            React.createElement('ul', { className: "space-y-2" },
                navItems.map((id, index) => {
                    const isCurrent = id === currentSceneId;
                    const isDisabled = firstPendingSceneIndex !== -1 && index > firstPendingSceneIndex;

                    let label = '';
                    if (id === 'cover') label = 'Cover';
                    else if (id === 'end') label = 'End Scene';
                    else label = `Page ${id}`;

                    return (
                        React.createElement('li', { key: id },
                            React.createElement('button', {
                                onClick: () => !isDisabled && setCurrentSceneId(id),
                                disabled: isDisabled,
                                className: `w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                    isCurrent ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`
                            },
                                label
                            )
                        )
                    );
                })
            )
        )
    );
};

// --- Scene Generator: The Core Logic Component ---
const SceneGenerator = ({ project, updateProject, currentSceneId, setCurrentSceneId, setError }) => {
    const currentSceneData = project.scenes[currentSceneId];

    if (!project.storyText) {
        return React.createElement(LayoutUploader, { project: project, updateProject: updateProject, setCurrentSceneId: setCurrentSceneId, setError: setError });
    }

    if (currentSceneData && currentSceneData.status === 'completed') {
        return React.createElement(CompletedSceneViewer, { sceneId: currentSceneId, project: project, updateProject: updateProject, setCurrentSceneId: setCurrentSceneId, setError: setError });
    }
    
    return React.createElement(SceneGeneratorUI, { sceneId: currentSceneId, project: project, updateProject: updateProject, setError: setError });
};

// --- Layout Uploader Component ---
const LayoutUploader = ({ project, updateProject, setCurrentSceneId, setError }) => {
    const [isFileParsing, setIsFileParsing] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [storyFile, setStoryFile] = useState(null);

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setStoryFile(file);
        setIsFileParsing(true);
        setError('');

        try {
            setLoadingMessage('Parsing document text...');
            let text = '';

            if (file.name.endsWith('.pdf')) {
                setError('PDF parsing requires additional setup. Please use a text file for now.');
                return;
            } else if (file.name.endsWith('.txt')) {
                text = await file.text();
            } else {
                throw new Error("Unsupported file type. Please upload a text file.");
            }
            
            if (!text.trim()) throw new Error("File is empty or text could not be extracted.");

            const pages = text.split(/\n\s*\n/).filter(p => p.trim() !== '');
            const totalPages = pages.length > 0 ? pages.length : 1;
            const scenes = { cover: { status: 'pending' }, end: { status: 'pending' } };
            for (let i = 1; i <= totalPages; i++) {
                scenes[i] = { status: 'pending', text: pages[i-1] || '' };
            }
            
            const projectUpdates = { 
                storyText: text, 
                totalPages, 
                scenes,
                name: 'My Animation Project',
                author: 'Author Name'
            };
            
            updateProject(project.id, projectUpdates);
            setCurrentSceneId('cover');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsFileParsing(false);
        }
    };

    return (
        React.createElement('div', { className: "bg-gray-800/50 p-6 rounded-lg" },
            React.createElement('h3', { className: "text-2xl font-bold mb-4" }, "Upload Your Story"),
            React.createElement('p', { className: "text-gray-400 mb-4" }, "Upload your story as a text file to get started."),
            React.createElement('label', { htmlFor: "story-upload", className: `flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg bg-gray-800/50 transition cursor-pointer hover:bg-gray-700/50` },
                isFileParsing ? (
                    React.createElement(React.Fragment, null,
                        React.createElement('span', { className: "text-indigo-400 text-2xl animate-spin" }, "⟳"),
                        React.createElement('p', { className: "mt-2 text-indigo-300" }, loadingMessage)
                    )
                ) : (
                    React.createElement(React.Fragment, null,
                        React.createElement('span', { className: "text-4xl" }, "📁"),
                        React.createElement('p', { className: "mt-2" }, storyFile ? storyFile.name : 'Click to upload'),
                        React.createElement('p', { className: "text-xs text-gray-500 mt-1" }, "Text file only")
                    )
                ),
                React.createElement('input', { id: "story-upload", type: "file", className: "hidden", accept: ".txt,.text", onChange: handleFileChange, disabled: isFileParsing })
            )
        )
    );
};

// --- Scene Generator UI ---
const SceneGeneratorUI = ({ sceneId, project, updateProject, setError }) => {
    const [imageFile, setImageFile] = useState(null);
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
        }
    };
    
    const handleGenerate = async () => {
        setIsLoading(true);
        setError('');

        try {
            // Simulate generation
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            const mockPrompt = {
                page_number: sceneId === 'cover' ? 0 : parseInt(sceneId) || 999,
                scene_summary: `Mock animation for ${sceneId}`,
                animation_style: { style: "cartoon", color_palette: "vibrant", tone: "cheerful" }
            };
            
            const updatedScenes = {
                ...project.scenes,
                [sceneId]: {
                    ...project.scenes[sceneId],
                    status: 'completed',
                    prompt: mockPrompt,
                    videoUrl: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                }
            };
            
            updateProject(project.id, { scenes: updatedScenes });

        } catch (err) {
            setError(`Generation failed: ${err.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const sceneText = project.scenes[sceneId]?.text;

    return (
        React.createElement('div', { className: "bg-gray-800/50 p-6 rounded-lg" },
            React.createElement('h3', { className: "text-2xl font-bold mb-4" }, `Generate ${sceneId === 'cover' ? 'Cover' : sceneId === 'end' ? 'End Scene' : `Page ${sceneId}`}`),
            
            sceneId !== 'end' && (
                React.createElement('div', { className: "mb-4" },
                    React.createElement('label', { className: "block mb-2 font-semibold text-gray-300" }, "Upload Image"),
                    React.createElement('input', { type: "file", accept: "image/*", onChange: handleImageChange, className: "w-full p-2 bg-gray-900 border border-gray-600 rounded" })
                )
            ),

            sceneText && (
                React.createElement('div', { className: "mb-4" },
                    React.createElement('label', { className: "block mb-2 font-semibold text-gray-300" }, "Scene Text"),
                    React.createElement('p', { className: "text-gray-400 bg-gray-900 p-4 rounded-md" }, sceneText)
                )
            ),
            
            React.createElement(Button, { onClick: handleGenerate, disabled: isLoading },
                isLoading ? "Generating..." : "Generate Scene"
            )
        )
    );
};

// --- Completed Scene Viewer ---
const CompletedSceneViewer = ({ sceneId, project, updateProject, setCurrentSceneId, setError }) => {
    const sceneData = project.scenes[sceneId];
    
    const getNextScene = () => {
        const navItems = ['cover', ...Array.from({ length: project.totalPages }, (_, i) => String(i + 1)), 'end'];
        const currentIndex = navItems.findIndex(id => id === sceneId);
        return navItems[currentIndex + 1];
    };

    const nextSceneId = getNextScene();

    return (
        React.createElement('div', { className: "bg-gray-800/50 p-6 rounded-lg" },
            React.createElement('h3', { className: "text-2xl font-bold mb-4" }, `Completed: ${sceneId === 'cover' ? 'Cover' : sceneId === 'end' ? 'End Scene' : `Page ${sceneId}`}`),
            
            React.createElement('div', { className: "mb-4 aspect-video bg-black rounded-lg flex items-center justify-center" },
                sceneData.videoUrl ? (
                    React.createElement('video', { src: sceneData.videoUrl, controls: true, autoPlay: true, muted: true, loop: true, className: "w-full h-full rounded-lg" })
                ) : (
                    React.createElement('p', { className: "text-gray-400" }, "Video preview")
                )
            ),

            nextSceneId && (
                React.createElement(Button, { onClick: () => setCurrentSceneId(nextSceneId), variant: "secondary" },
                    "Go to Next Scene"
                )
            )
        )
    );
};

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));