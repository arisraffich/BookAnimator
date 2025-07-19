const { useState, useEffect } = React;

// --- LocalStorage Hooks for Data Persistence ---
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };
  return [storedValue, setValue];
};


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
    <button onClick={onClick} disabled={disabled} className={`${baseClasses} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
};

const ConfirmationModal = ({ project, onConfirm, onCancel }) => {
    if (!project) return null;
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 max-w-sm w-full mx-4">
                <div className="flex items-center gap-4 mb-4">
                    <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-500/20">
                        <lucide.AlertTriangle className="h-6 w-6 text-red-400" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Delete Project</h3>
                        <p className="text-sm text-gray-400">Are you sure you want to delete "{project.name}"? This action cannot be undone.</p>
                    </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                    <Button onClick={onCancel} variant="secondary">Cancel</Button>
                    <Button onClick={onConfirm} variant="danger">Delete</Button>
                </div>
            </div>
        </div>
    );
};


// --- Main App: Manages Views (Dashboard vs. Workspace) ---
function App() {
  const [projects, setProjects] = useLocalStorage('animation-projects', []);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [projectToDelete, setProjectToDelete] = useState(null);

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
      <ProjectWorkspace
        project={currentProject}
        updateProject={updateProject}
        goToDashboard={() => setCurrentProjectId(null)}
      />
    );
  }

  return (
    <React.Fragment>
        <ConfirmationModal 
            project={projectToDelete} 
            onConfirm={confirmDeleteProject} 
            onCancel={() => setProjectToDelete(null)} 
        />
        <ProjectsDashboard
          projects={projects}
          createNewProject={createNewProject}
          deleteProject={(project) => setProjectToDelete(project)}
          selectProject={setCurrentProjectId}
        />
    </React.Fragment>
  );
}

// --- Projects Dashboard View ---
const ProjectsDashboard = ({ projects, createNewProject, deleteProject, selectProject }) => (
  <div className="min-h-screen bg-gray-900 text-gray-200 font-sans p-4 sm:p-6 lg:p-8">
    <div className="max-w-4xl mx-auto">
      <header className="text-center mb-8">
        <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">Animation Studio</h1>
        <p className="mt-4 text-lg text-gray-400">Your projects are saved in your browser.</p>
      </header>
      <div className="mb-8">
        <Button onClick={createNewProject}>
          <lucide.PlusCircle size={20} /> New Project
        </Button>
      </div>
      <div className="space-y-4">
        {projects.length > 0 ? projects.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(p => (
          <div key={p.id} className="bg-gray-800/50 border border-gray-700 rounded-xl p-4 flex justify-between items-center">
            <div>
              <h2 className="text-xl font-bold text-white">{p.name}</h2>
              <p className="text-sm text-gray-400">By {p.author} | {p.totalPages} Pages</p>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => selectProject(p.id)} variant="secondary">Open</Button>
              <Button onClick={() => deleteProject(p)} variant="danger"><lucide.Trash2 size={16} /></Button>
            </div>
          </div>
        )) : (
          <p className="text-center text-gray-500">No projects yet. Click "New Project" to start!</p>
        )}
      </div>
    </div>
  </div>
);

// --- Project Workspace View ---
const ProjectWorkspace = ({ project, updateProject, goToDashboard }) => {
    const [currentSceneId, setCurrentSceneId] = useState('cover');
    const [error, setError] = useState('');
    
    useEffect(() => {
        if (project.storyText) {
            const navItems = ['cover', ...Array.from({ length: project.totalPages }, (_, i) => String(i + 1)), 'end'];
            const firstPendingScene = navItems.find(id => !project.scenes[id] || project.scenes[id].status !== 'completed');
            if (firstPendingScene && firstPendingScene !== currentSceneId) {
                setCurrentSceneId(firstPendingScene);
            }
        } else {
            setCurrentSceneId('cover');
        }
    }, [project.id, project.scenes, project.storyText, project.totalPages, currentSceneId]);

    return (
        <div className="min-h-screen bg-gray-900 text-gray-200 font-sans flex">
            <PageNavigation project={project} currentSceneId={currentSceneId} setCurrentSceneId={setCurrentSceneId} goToDashboard={goToDashboard} />
            <main className="flex-1 p-8 overflow-y-auto">
                 <header className="mb-8 flex justify-between items-start">
                    <div>
                        <h1 className="text-3xl font-bold text-white">{project.name}</h1>
                        <p className="text-md text-gray-400">By: {project.author}</p>
                    </div>
                 </header>
                 {error && (
                    <div className="w-full bg-red-500/20 border border-red-500 text-red-300 p-4 rounded-lg mb-4">
                        <p><span className="font-bold">Error:</span> {error}</p>
                    </div>
                )}
                <SceneGenerator project={project} updateProject={updateProject} currentSceneId={currentSceneId} setCurrentSceneId={setCurrentSceneId} setError={setError} />
            </main>
        </div>
    );
};

// --- Page Navigation Sidebar ---
const PageNavigation = ({ project, currentSceneId, setCurrentSceneId, goToDashboard }) => {
    const navItems = project.totalPages > 0 ? ['cover', ...Array.from({ length: project.totalPages }, (_, i) => String(i + 1)), 'end'] : [];
    
    const firstPendingSceneIndex = navItems.findIndex(id => !project.scenes[id] || project.scenes[id].status !== 'completed');

    return (
        <nav className="w-64 bg-gray-900/50 border-r border-gray-800 p-4 flex flex-col">
            <Button onClick={goToDashboard} variant="secondary" className="mb-6"><lucide.Home size={16} /> Dashboard</Button>
            {navItems.length > 0 && <h3 className="text-lg font-semibold text-white mb-4">Project Pages</h3>}
            <ul className="space-y-2">
                {navItems.map((id, index) => {
                    const isCurrent = id === currentSceneId;
                    const isDisabled = firstPendingSceneIndex !== -1 && index > firstPendingSceneIndex;

                    let label = '';
                    if (id === 'cover') label = 'Cover';
                    else if (id === 'end') label = 'End Scene';
                    else label = `Page ${id}`;

                    return (
                        <li key={id}>
                            <button
                                onClick={() => !isDisabled && setCurrentSceneId(id)}
                                disabled={isDisabled}
                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                                    isCurrent ? 'bg-indigo-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                {label}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

// --- Scene Generator: The Core Logic Component ---
const SceneGenerator = ({ project, updateProject, currentSceneId, setCurrentSceneId, setError }) => {
    const currentSceneData = project.scenes[currentSceneId];

    if (!project.storyText) {
        return <LayoutUploader project={project} updateProject={updateProject} setCurrentSceneId={setCurrentSceneId} setError={setError} />;
    }

    if (currentSceneData && currentSceneData.status === 'completed') {
        return <CompletedSceneViewer sceneId={currentSceneId} project={project} updateProject={updateProject} setCurrentSceneId={setCurrentSceneId} setError={setError} />
    }
    
    return <SceneGeneratorUI sceneId={currentSceneId} project={project} updateProject={updateProject} setError={setError} />;
};


// --- Specific Scene Components ---

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
            let coverImageBase64 = '';

            if (file.name.endsWith('.pdf')) {
                if (!window.pdfjsLib) throw new Error("PDF parsing library not loaded.");
                window.pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js`;
                
                const fileBuffer = await file.arrayBuffer();
                
                const pdf = await window.pdfjsLib.getDocument(fileBuffer).promise;
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    fullText += textContent.items.map(item => item.str).join(' ') + '\n\n';
                }
                text = fullText;

                setLoadingMessage('Extracting cover image...');
                const coverPage = await pdf.getPage(1);
                const viewport = coverPage.getViewport({ scale: 1.5 });
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                await coverPage.render({ canvasContext: context, viewport: viewport }).promise;
                coverImageBase64 = canvas.toDataURL('image/jpeg').split(',')[1];

            } else {
                throw new Error("Unsupported file type. Please upload a PDF layout file.");
            }
            
            if (!text.trim()) throw new Error("File is empty or text could not be extracted.");

            const pages = text.split(/\n\s*\n/).filter(p => p.trim() !== '');
            const totalPages = pages.length > 0 ? pages.length : 1;
            const scenes = { cover: { status: 'pending' }, end: { status: 'pending' } };
            for (let i = 1; i <= totalPages; i++) {
                scenes[i] = { status: 'pending', text: pages[i-1] || '' };
            }
            
            const initialProjectState = { ...project, storyText: text, totalPages, scenes };
            
            setLoadingMessage('Generating opening scene...');
            const newPrompt = await generateScene(initialProjectState, 'cover', coverImageBase64, '', updateProject, setError);
            const videoUrl = await generateVideoFromPrompt(newPrompt);

            const finalScenes = {
                ...initialProjectState.scenes,
                cover: { status: 'completed', prompt: newPrompt, videoUrl }
            };

            const finalProjectState = {
                ...initialProjectState,
                scenes: finalScenes,
                name: newPrompt.extracted_title || project.name,
                author: newPrompt.extracted_author || project.author,
            };
            
            updateProject(project.id, finalProjectState);
            setCurrentSceneId('cover');

        } catch (err) {
            setError(err.message);
        } finally {
            setIsFileParsing(false);
        }
    };

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-4">Upload Your Book's Layout</h3>
            <p className="text-gray-400 mb-4">Upload your book's layout as a PDF. The app will extract the text, use the first page as the cover, and automatically generate the opening scene.</p>
            <label htmlFor="story-upload" className={`flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg bg-gray-800/50 transition cursor-pointer hover:bg-gray-700/50`}>
                {isFileParsing ? (
                    <React.Fragment>
                        <lucide.Loader2 className="animate-spin text-indigo-400" size={32} />
                        <p className="mt-2 text-indigo-300">{loadingMessage}</p>
                    </React.Fragment>
                ) : (
                    <React.Fragment>
                        <lucide.UploadCloud size={32} />
                        <p className="mt-2">{storyFile ? storyFile.name : 'Click to upload'}</p>
                        <p className="text-xs text-gray-500 mt-1">PDF file only</p>
                    </React.Fragment>
                )}
                <input id="story-upload" type="file" className="hidden" accept=".pdf" onChange={handleFileChange} disabled={isFileParsing} />
            </label>
        </div>
    );
};

const CompletedSceneViewer = ({ sceneId, project, updateProject, setCurrentSceneId, setError }) => {
    const sceneData = project.scenes[sceneId];
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [copySuccess, setCopySuccess] = useState('');
    const [showJson, setShowJson] = useState(false);

    const copyToClipboard = () => {
        if (!sceneData?.prompt) return;
        const jsonString = JSON.stringify(sceneData.prompt, null, 2);
        
        const textArea = document.createElement('textarea');
        textArea.value = jsonString;
        textArea.style.position = 'fixed'; 
        textArea.style.top = '0';
        textArea.style.left = '0';
        textArea.style.opacity = '0';

        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
            const successful = document.execCommand('copy');
            if (successful) {
                setCopySuccess('Copied!');
            } else {
                setCopySuccess('Failed!');
            }
        } catch (err) {
            setCopySuccess('Failed!');
            console.error('Fallback: Oops, unable to copy', err);
        }

        document.body.removeChild(textArea);
        setTimeout(() => setCopySuccess(''), 2000);
    };
    
    const getNextScene = () => {
        const navItems = ['cover', ...Array.from({ length: project.totalPages }, (_, i) => String(i + 1)), 'end'];
        const currentIndex = navItems.findIndex(id => id === sceneId);
        return navItems[currentIndex + 1];
    };

    const nextSceneId = getNextScene();

    return (
        <div className="bg-gray-800/50 p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-4">Completed: {sceneId === 'cover' ? 'Cover' : sceneId === 'end' ? 'End Scene' : `Page ${sceneId}`}</h3>
            
            <div className="flex flex-wrap gap-4 items-center mb-4 pb-4 border-b border-gray-700">
                 <Button onClick={copyToClipboard} variant="primary">
                    <lucide.Clipboard size={16}/> {copySuccess || `Copy Prompt`}
                </Button>
                <Button onClick={() => setIsRegenerating(prev => !prev)} variant="warning">
                    <lucide.RefreshCw size={16}/> {isRegenerating ? 'Cancel' : 'Regenerate'}
                </Button>
                {nextSceneId && (
                    <Button onClick={() => setCurrentSceneId(nextSceneId)} variant="secondary">
                        Go to Next Scene <lucide.ArrowRight size={16} />
                    </Button>
                )}
            </div>

            <div className="mb-4 aspect-video bg-black rounded-lg flex items-center justify-center">
                {sceneData.videoUrl ? (
                    <video src={sceneData.videoUrl} controls autoPlay muted loop className="w-full h-full rounded-lg" />
                ) : (
                    <p className="text-gray-400">Video would be displayed here.</p>
                )}
            </div>

            <div className="flex flex-wrap gap-4 items-center">
                 <a href={sceneData.videoUrl} download={`${project.name.replace(/\s/g, '_')}_Scene_${sceneId}.mp4`}>
                    <Button variant="secondary">
                        <lucide.Download size={16}/> Download Video
                    </Button>
                 </a>
                 <Button onClick={() => setShowJson(prev => !prev)} variant="secondary">
                    {showJson ? <lucide.EyeOff size={16}/> : <lucide.Eye size={16}/>} {showJson ? 'Hide Prompt' : 'Show Prompt'}
                </Button>
            </div>

            {showJson && (
                 <div className="bg-gray-900 mt-4 p-4 rounded-md font-mono text-sm overflow-x-auto">
                    <pre><code>{JSON.stringify(sceneData.prompt, null, 2)}</code></pre>
                </div>
            )}

            {isRegenerating && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                     <SceneGeneratorUI 
                        sceneId={sceneId} 
                        project={project} 
                        updateProject={updateProject} 
                        setError={setError} 
                        isRegenerating={true}
                     />
                </div>
            )}
        </div>
    );
};


// --- Universal Scene Generation UI and Logic ---
const SceneGeneratorUI = ({ sceneId, project, updateProject, setError, isRegenerating = false }) => {
    const [imageFile, setImageFile] = useState(null);
    const [imageBase64, setImageBase64] = useState('');
    const [feedback, setFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Generating...');

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setImageFile(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImageBase64(reader.result.split(',')[1]);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleGenerate = async () => {
        if ((sceneId !== 'end' && !imageBase64) && !isRegenerating) {
            setError('Please upload an illustration for this page.');
            return;
        }
        setIsLoading(true);
        setLoadingMessage('Generating JSON prompt...');
        setError('');

        try {
            const newPrompt = await generateScene(project, sceneId, imageBase64, feedback, updateProject, setError);
            
            setLoadingMessage('Generating video...');
            const videoUrl = await generateVideoFromPrompt(newPrompt);
            
            const updatedScenes = {
                ...project.scenes,
                [sceneId]: {
                    ...project.scenes[sceneId],
                    status: 'completed',
                    prompt: newPrompt,
                    videoUrl: videoUrl,
                }
            };
            
            let projectUpdates = { scenes: updatedScenes };
            if (sceneId === 'cover' && newPrompt.extracted_title) {
                projectUpdates.name = newPrompt.extracted_title;
                projectUpdates.author = newPrompt.extracted_author || 'Unknown Author';
            }

            updateProject(project.id, projectUpdates);

        } catch (err) {
            setError(`Operation failed: ${err.message}.`);
        } finally {
            setIsLoading(false);
        }
    };

    const sceneText = project.scenes[sceneId]?.text;

    let headerText = '';
    if (sceneId === 'cover') headerText = 'Generate Cover Animation';
    else if (sceneId === 'end') headerText = 'Generate End Scene';
    else headerText = `Generate Animation for Page ${sceneId}`;
    if (isRegenerating) headerText = `Regenerate: ${headerText.split(' ')[0]}`;


    return (
        <div className="bg-gray-800/50 p-6 rounded-lg">
            <h3 className="text-2xl font-bold mb-4">{headerText}</h3>
            
            {sceneId !== 'end' && (
                <div className="mb-4">
                    <label className="block mb-2 font-semibold text-gray-300">
                        {`Illustration for Page ${sceneId}`}
                    </label>
                    <label htmlFor="scene-image-upload" className="flex flex-col items-center justify-center w-full h-48 border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:bg-gray-700/50">
                        <lucide.UploadCloud />
                        <p>{imageFile ? imageFile.name : 'Click to upload'}</p>
                        <input id="scene-image-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
                    </label>
                </div>
            )}

            {sceneText && (
                <div className="mb-4">
                    <label className="block mb-2 font-semibold text-gray-300">Scene Text</label>
                    <p className="text-gray-400 bg-gray-900 p-4 rounded-md">{sceneText}</p>
                </div>
            )}
            
            {isRegenerating && (
                 <div className="mb-4">
                    <label htmlFor="feedback-text" className="block mb-2 font-semibold text-gray-300">What would you like to change?</label>
                    <textarea
                        id="feedback-text"
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder="e.g., Make the character's smile bigger. Change the camera to a slow zoom in."
                        className="w-full h-24 p-3 bg-gray-900 border border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition"
                    />
                </div>
            )}
            
            {sceneId === 'end' && (
                <p className="text-gray-300 mb-4">All pages are complete. The end scene will be generated using the context of the entire story.</p>
            )}

            <Button onClick={handleGenerate} disabled={isLoading}>
                {isLoading ? <React.Fragment><lucide.Loader2 className="animate-spin" /> {loadingMessage}</React.Fragment> : <React.Fragment><lucide.Wand2 /> Generate Scene</React.Fragment>}
            </Button>
        </div>
    );
};

// --- Reusable API and Generation Logic ---

const animationPromptSchema = {
    type: "OBJECT",
    properties: {
        page_number: { type: "NUMBER" },
        scene_summary: { type: "STRING" },
        animation_style: { type: "OBJECT", properties: { style: { type: "STRING" }, color_palette: { type: "STRING" }, tone: { type: "STRING" }}},
        scene: { type: "OBJECT", properties: { location: { type: "STRING" }, time_of_day: { type: "STRING" }, environment_details: { type: "STRING" }}},
        characters: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, description: { type: "STRING" }, initial_expression: { type: "STRING" }}}},
        camera: { type: "OBJECT", properties: { shot_type: { type: "STRING" }, movement: { type: "STRING" }}},
        action: { type: "OBJECT", properties: { primary_action: { type: "STRING" }, subtle_motions: { type: "STRING" }}},
        audio: { type: "OBJECT", properties: { sound_effects: { type: "ARRAY", items: { type: "STRING" } }, dialogue: { type: "OBJECT", properties: { character: { type: "STRING" }, line: { type: "STRING" }, voice_actor: { type: "STRING" }}}}},
        metadata: { type: "OBJECT", properties: { estimated_duration_seconds: { type: "NUMBER" }, notes: { type: "STRING" }}},
        extracted_title: { type: "STRING" },
        extracted_author: { type: "STRING" },
    }
};

const buildApiPromptText = (project, sceneId, feedback) => {
    let systemInstruction = `You are an expert animation director for children's content. Your task is to analyze a single children's book scene (text and illustration) within the context of an entire story. You will generate a structured JSON object that serves as a technical animation prompt. All descriptions must be child-friendly and safe.`;
    let taskInstruction = '';
    const sceneText = project.scenes[sceneId]?.text || '';
    const fullStoryContext = project.storyText || "No story context provided yet.";

    if (sceneId === 'cover') {
        taskInstruction = `Analyze the attached book cover image. Based on the visuals, generate a dynamic opening title sequence animation. IMPORTANT: Also, extract the book's title and author's name from the cover image text. Populate the 'extracted_title' and 'extracted_author' fields in the JSON. The animation should hint at the story's main themes and characters.`;
    } else if (sceneId === 'end') {
        taskInstruction = `All pages are complete. Generate a concluding animation prompt. This should be a gentle, summary scene, perhaps a final shot of the main character or a pan across the main setting, evoking a feeling of happy resolution. Use the full story context for inspiration.`;
    } else {
        taskInstruction = `Analyze the attached illustration and its corresponding text for Page ${sceneId}. Generate a detailed animation prompt based on these assets, interpreted within the broader context of the full story provided below.`;
    }
    
    if (feedback) {
        taskInstruction += `\n\nREGENERATION FEEDBACK: The previous attempt was not quite right. Please regenerate the JSON, taking this user feedback into account: "${feedback}"`;
    }
    
    return `
        SYSTEM INSTRUCTION: ${systemInstruction}
        FULL STORY CONTEXT:
        ${fullStoryContext}
        ---
        CURRENT SCENE ANALYSIS TASK:
        - Scene ID: ${sceneId}
        - Scene Text (if applicable): "${sceneText}"
        - Task: ${taskInstruction}
        Now, populate the JSON schema based on this task.
    `;
};

const generateScene = async (project, sceneId, imageBase64, feedback, updateProject, setError) => {
    const textPrompt = buildApiPromptText(project, sceneId, feedback);
    const payload = {
        contents: [{
            role: "user",
            parts: [
                { text: textPrompt },
                ...(imageBase64 ? [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }] : [])
            ]
        }],
        generationConfig: {
            responseMimeType: "application/json",
            responseSchema: animationPromptSchema,
        }
    };

    try {
        const apiKey = ""; // API key is handled by the environment
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API Error: ${response.status} ${response.statusText} - ${errorBody}`);
        }

        const result = await response.json();
        
        if (result.candidates && result.candidates.length > 0) {
            const jsonText = result.candidates[0].content.parts[0].text;
            const newPrompt = JSON.parse(jsonText);
            
            return newPrompt;

        } else {
            throw new Error('The model returned an empty or invalid response.');
        }
    } catch (err) {
        throw err;
    }
};

// SIMULATE VIDEO GENERATION
const generateVideoFromPrompt = async (prompt) => {
    console.log("Simulating video generation for prompt:", prompt);
    await new Promise(res => setTimeout(res, 4000)); 
    return 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
};

// Mount the app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
