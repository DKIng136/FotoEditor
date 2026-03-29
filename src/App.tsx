import React, { useState, useRef, ChangeEvent, useCallback } from 'react';
import { 
  Upload, 
  Download, 
  Sun, 
  Contrast, 
  Droplets, 
  Palette, 
  RotateCcw, 
  Image as ImageIcon,
  Maximize2,
  Minimize2,
  Layers,
  Settings2,
  Undo2,
  Redo2,
  RotateCw,
  Crop as CropIcon,
  History as HistoryIcon,
  Check,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactCrop, { type Crop, type PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface Filters {
  exposure: number;
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  sepia: number;
  grayscale: number;
  blur: number;
  vignette: number;
  rotation: number;
}

const DEFAULT_FILTERS: Filters = {
  exposure: 100,
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hue: 0,
  sepia: 0,
  grayscale: 0,
  blur: 0,
  vignette: 0,
  rotation: 0,
};

interface HistoryState {
  image: string;
  filters: Filters;
  info: { width: number; height: number; name: string };
}

type Tab = 'adjust' | 'transform' | 'history';

const ASPECT_RATIOS = [
  { label: 'Tự do', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
  { label: '3:2', value: 3 / 2 },
  { label: '2:3', value: 2 / 3 },
];

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [activeTab, setActiveTab] = useState<Tab>('adjust');
  const [isZoomed, setIsZoomed] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showOriginal, setShowOriginal] = useState(false);
  const [imageInfo, setImageInfo] = useState<{ width: number; height: number; name: string } | null>(null);

  // Crop State
  const [isCropMode, setIsCropMode] = useState(false);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const addToHistory = (img: string, f: Filters, info: { width: number; height: number; name: string }) => {
    const newState: HistoryState = { image: img, filters: { ...f }, info: { ...info } };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newState);
    if (newHistory.length > 20) newHistory.shift();
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setImage(prev.image);
      setFilters(prev.filters);
      setImageInfo(prev.info);
      setHistoryIndex(historyIndex - 1);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setImage(next.image);
      setFilters(next.filters);
      setImageInfo(next.info);
      setHistoryIndex(historyIndex + 1);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsProcessing(true);
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const info = {
            width: img.width,
            height: img.height,
            name: file.name
          };
          const dataUrl = event.target?.result as string;
          setImage(dataUrl);
          setOriginalImage(dataUrl);
          setImageInfo(info);
          setFilters(DEFAULT_FILTERS);
          
          const initialState: HistoryState = { image: dataUrl, filters: DEFAULT_FILTERS, info };
          setHistory([initialState]);
          setHistoryIndex(0);
          setIsProcessing(false);
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFilterChange = (name: keyof Filters, value: number) => {
    setFilters(prev => ({ ...prev, [name]: value }));
  };

  const handleFilterChangeEnd = () => {
    if (image && imageInfo) {
      addToHistory(image, filters, imageInfo);
    }
  };

  const resetAll = () => {
    if (originalImage) {
      const img = new Image();
      img.onload = () => {
        const info = {
          width: img.width,
          height: img.height,
          name: imageInfo?.name || 'Ảnh gốc'
        };
        setImage(originalImage);
        setImageInfo(info);
        setFilters(DEFAULT_FILTERS);
        addToHistory(originalImage, DEFAULT_FILTERS, info);
      };
      img.src = originalImage;
    }
  };

  const restoreOriginalImage = () => {
    if (originalImage) {
      const img = new Image();
      img.onload = () => {
        const info = {
          width: img.width,
          height: img.height,
          name: imageInfo?.name || 'Ảnh gốc'
        };
        setImage(originalImage);
        setImageInfo(info);
        // Giữ nguyên filters hiện tại, chỉ khôi phục khung ảnh
        addToHistory(originalImage, filters, info);
      };
      img.src = originalImage;
    }
  };

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const initialCrop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        aspect || 1,
        width,
        height
      ),
      width,
      height
    );
    setCrop(initialCrop);
  };

  const handleAspectChange = (newAspect: number | undefined) => {
    setAspect(newAspect);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      if (newAspect) {
        const newCrop = centerCrop(
          makeAspectCrop(
            {
              unit: '%',
              width: 90,
            },
            newAspect,
            width,
            height
          ),
          width,
          height
        );
        setCrop(newCrop);
      } else {
        // Free form
        setCrop({
          unit: '%',
          width: 90,
          height: 90,
          x: 5,
          y: 5
        });
      }
    }
  };

  const applyCrop = async () => {
    if (!image || !completedCrop || !imgRef.current || !imageInfo) return;
    setIsProcessing(true);
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const croppedDataUrl = canvas.toDataURL('image/png');
    const newInfo = { ...imageInfo, width: Math.round(canvas.width), height: Math.round(canvas.height) };
    
    setImage(croppedDataUrl);
    setImageInfo(newInfo);
    addToHistory(croppedDataUrl, filters, newInfo);
    setIsCropMode(false);
    setIsProcessing(false);
  };

  const downloadImage = async () => {
    if (!image || !canvasRef.current || !imageRef.current) return;

    setIsProcessing(true);
    await new Promise(r => setTimeout(r, 800));

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const img = imageRef.current;

    if (!ctx) return;

    // Handle rotation in dimensions
    const isVertical = filters.rotation % 180 !== 0;
    canvas.width = isVertical ? img.naturalHeight : img.naturalWidth;
    canvas.height = isVertical ? img.naturalWidth : img.naturalHeight;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((filters.rotation * Math.PI) / 180);
    
    ctx.filter = `
      brightness(${filters.exposure}%)
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      saturate(${filters.saturation}%)
      hue-rotate(${filters.hue}deg)
      sepia(${filters.sepia}%)
      grayscale(${filters.grayscale}%)
      blur(${filters.blur}px)
    `;

    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    ctx.restore();

    // Apply Vignette
    if (filters.vignette > 0) {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.sqrt(Math.pow(canvas.width / 2, 2) + Math.pow(canvas.height / 2, 2))
      );
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100})`);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    const link = document.createElement('a');
    link.download = `chinh-sua-anh-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
    setIsProcessing(false);
  };

  const filterStyle = showOriginal ? {} : {
    filter: `
      brightness(${filters.exposure}%)
      brightness(${filters.brightness}%)
      contrast(${filters.contrast}%)
      saturate(${filters.saturation}%)
      hue-rotate(${filters.hue}deg)
      sepia(${filters.sepia}%)
      grayscale(${filters.grayscale}%)
      blur(${filters.blur}px)
    `,
    transform: `rotate(${filters.rotation}deg)`,
    transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
  };

  return (
    <div className="flex h-screen bg-[#050506] text-[#FAFAFA] overflow-hidden font-sans bg-atmosphere">
      {/* Left Sidebar */}
      <aside className="w-16 border-r border-white/5 flex flex-col items-center py-6 gap-8 bg-black/20 backdrop-blur-2xl z-30">
        <div className="group relative cursor-pointer">
          <motion.div 
            animate={{ 
              rotate: [0, 360],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              rotate: { duration: 20, repeat: Infinity, ease: "linear" },
              scale: { duration: 4, repeat: Infinity, ease: "easeInOut" }
            }}
            className="absolute -inset-3 bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 blur-2xl opacity-30 group-hover:opacity-60 transition-opacity" 
          />
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-purple-500/20 relative border border-white/20 overflow-hidden">
            <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]" />
            <span className="text-[18px] font-normal tracking-normal text-white relative z-10 drop-shadow-md font-bubble">BpE</span>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-white/20 blur-md rounded-full" />
          </div>
        </div>
        
        <nav className="flex flex-col gap-4">
          <ToolIcon icon={<ImageIcon size={20} />} active={activeTab === 'adjust'} onClick={() => setActiveTab('adjust')} />
          <ToolIcon icon={<Layers size={20} />} active={activeTab === 'transform'} onClick={() => setActiveTab('transform')} />
          <ToolIcon icon={<HistoryIcon size={20} />} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
        </nav>

        <div className="mt-auto flex flex-col gap-4">
          <button 
            onMouseDown={() => setShowOriginal(true)}
            onMouseUp={() => setShowOriginal(false)}
            onMouseLeave={() => setShowOriginal(false)}
            disabled={!image}
            className={`p-3 rounded-xl transition-all ${showOriginal ? 'bg-purple-600 text-white' : 'text-[#52525B] hover:bg-[#141417]'} ${!image && 'opacity-20'}`}
            title="Nhấn giữ để xem ảnh gốc"
          >
            <Minimize2 size={20} />
          </button>
          <ToolIcon icon={<RotateCcw size={20} />} onClick={resetAll} disabled={!image} />
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="flex-1 flex flex-col relative">
        <header className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-black/40 backdrop-blur-2xl z-20">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 font-black mb-0.5">Dự án</span>
              <span className="text-xs font-medium text-[#FAFAFA] truncate max-w-[200px]">
                {imageInfo?.name || "Dự_án_chưa_đặt_tên"}
              </span>
            </div>
            {image && (
              <>
                <div className="h-6 w-px bg-white/10" />
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[#52525B] font-bold mb-0.5">Độ phân giải</span>
                  <span className="text-[10px] font-mono text-[#A1A1AA]">
                    {imageInfo?.width} × {imageInfo?.height} PX
                  </span>
                </div>
                <div className="h-6 w-px bg-white/10" />
                <div className="flex items-center gap-1 bg-white/5 p-1 rounded-lg border border-white/5">
                  <button 
                    onClick={undo} 
                    disabled={historyIndex <= 0}
                    className="p-1.5 text-[#52525B] hover:text-white hover:bg-white/5 rounded-md disabled:opacity-20 transition-all"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button 
                    onClick={redo} 
                    disabled={historyIndex >= history.length - 1}
                    className="p-1.5 text-[#52525B] hover:text-white hover:bg-white/5 rounded-md disabled:opacity-20 transition-all"
                  >
                    <Redo2 size={14} />
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!image ? (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-full transition-all active:scale-95 shadow-lg shadow-purple-900/40 border border-white/10"
              >
                <Upload size={14} />
                NHẬP ẢNH
              </button>
            ) : (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-[#A1A1AA] hover:text-white hover:bg-white/5 rounded-full transition-all border border-transparent hover:border-white/10"
                  title="Thay đổi ảnh"
                >
                  <Upload size={16} />
                </button>
                <button
                  onClick={downloadImage}
                  disabled={isProcessing}
                  className="flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white text-xs font-black rounded-full transition-all active:scale-95 disabled:opacity-50 shadow-xl shadow-purple-900/20 border border-white/10"
                >
                  {isProcessing ? (
                    <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  XUẤT FILE
                </button>
              </>
            )}
          </div>
        </header>

        <div className="flex-1 relative bg-[#020203] flex items-center justify-center p-12 overflow-hidden">
          <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
               style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
          
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />

          <AnimatePresence mode="wait">
            {!image ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="text-center space-y-6 z-10"
              >
                <div className="w-24 h-24 mx-auto bg-[#141417] border border-[#27272A] rounded-[2rem] flex items-center justify-center text-[#3F3F46]">
                  <ImageIcon size={48} strokeWidth={1.5} />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-bold tracking-tight">Studio Chuyên Nghiệp</h2>
                  <p className="text-[#A1A1AA] max-w-xs mx-auto text-sm leading-relaxed">
                    Tải ảnh lên để bắt đầu quy trình hậu kỳ với các thông số kỹ thuật cao.
                  </p>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-8 py-3 bg-[#1C1C21] border border-[#27272A] hover:border-purple-500/50 hover:bg-purple-500/5 rounded-xl text-sm font-semibold transition-all active:scale-95"
                >
                  Chọn tệp từ thiết bị
                </button>
              </motion.div>
            ) : isCropMode ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center p-4"
              >
                <div className="relative max-w-full max-h-[82vh] overflow-auto custom-scrollbar flex items-center justify-center">
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    aspect={aspect}
                    className="max-w-full"
                  >
                    <img
                      ref={imgRef}
                      src={image}
                      alt="Nguồn cắt"
                      onLoad={onImageLoad}
                      className="max-w-full max-h-[82vh] object-contain"
                      style={{ filter: filterStyle.filter }}
                    />
                  </ReactCrop>
                </div>

                <div className="mt-4 flex flex-col items-center gap-4 z-50 w-full max-w-2xl px-4">
                  <div className="flex flex-wrap justify-center gap-1.5 bg-[#141417]/80 backdrop-blur-md p-2 rounded-xl border border-[#27272A] shadow-2xl">
                    {ASPECT_RATIOS.map((ratio) => (
                      <button
                        key={ratio.label}
                        onClick={() => handleAspectChange(ratio.value)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-bold uppercase transition-all ${
                          aspect === ratio.value 
                            ? 'bg-purple-600 text-white' 
                            : 'bg-[#1C1C21] text-[#A1A1AA] hover:bg-[#27272A]'
                        }`}
                      >
                        {ratio.label}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button 
                      onClick={() => setIsCropMode(false)}
                      className="px-6 py-2 bg-[#1C1C21] border border-[#27272A] rounded-lg text-xs font-bold hover:bg-[#27272A] transition-all"
                    >
                      Hủy
                    </button>
                    <button 
                      onClick={applyCrop}
                      disabled={!completedCrop?.width || !completedCrop?.height}
                      className="px-8 py-2 bg-purple-600 rounded-lg text-xs font-bold hover:bg-purple-500 shadow-xl shadow-purple-900/20 transition-all disabled:opacity-50"
                    >
                      Áp dụng cắt
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative group transition-all duration-500 ease-out ${isZoomed ? 'scale-110' : 'scale-100'}`}
              >
                <div className="absolute -inset-4 bg-purple-600/10 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative overflow-hidden rounded-sm shadow-2xl shadow-black/50">
                  <img
                    ref={imageRef}
                    src={image}
                    alt="Vùng làm việc"
                    className="max-w-full max-h-[70vh] object-contain"
                    style={filterStyle}
                    referrerPolicy="no-referrer"
                  />
                  
                  {!showOriginal && filters.vignette > 0 && (
                    <div 
                      className="absolute inset-0 pointer-events-none transition-opacity duration-300"
                      style={{
                        background: `radial-gradient(circle, transparent 40%, rgba(0,0,0,${filters.vignette / 100}) 100%)`
                      }}
                    />
                  )}
                </div>
                
                <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-md border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-white/60">
                    {showOriginal ? "Ảnh gốc" : "Ảnh đã chỉnh sửa"}
                  </span>
                </div>

                <div className="absolute bottom-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setIsZoomed(!isZoomed)}
                    className="p-2 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 hover:bg-black/80 transition-colors"
                  >
                    {isZoomed ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {isProcessing && (
            <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px] z-50 flex items-center justify-center">
              <div className="bg-[#141417] border border-[#27272A] px-6 py-4 rounded-2xl flex items-center gap-4 shadow-2xl">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium">Đang xử lý dữ liệu...</span>
              </div>
            </div>
          )}
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
      </main>

      {/* Right Sidebar */}
      <aside className="w-80 border-l border-white/5 bg-black/40 backdrop-blur-2xl flex flex-col z-30">
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-purple-400">
            {activeTab === 'adjust' ? 'Điều chỉnh' : activeTab === 'transform' ? 'Biến đổi' : 'Lịch sử'}
          </h3>
          <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse-glow" />
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-10 custom-scrollbar pb-24">
          {!image ? (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <Settings2 size={32} strokeWidth={1} />
              <p className="text-xs leading-relaxed">Tải ảnh lên để kích hoạt<br/>bảng điều khiển chuyên sâu</p>
            </div>
          ) : activeTab === 'adjust' ? (
            <>
              <ControlGroup label="Ánh sáng & Phơi sáng" icon={<Sun size={14} className="text-orange-400" />}>
                <Slider label="Độ phơi sáng" value={filters.exposure} min={0} max={200} onChange={(v) => handleFilterChange('exposure', v)} onEnd={handleFilterChangeEnd} suffix="%" />
                <Slider label="Độ sáng" value={filters.brightness} min={0} max={200} onChange={(v) => handleFilterChange('brightness', v)} onEnd={handleFilterChangeEnd} suffix="%" />
                <Slider label="Độ tương phản" value={filters.contrast} min={0} max={200} onChange={(v) => handleFilterChange('contrast', v)} onEnd={handleFilterChangeEnd} suffix="%" />
              </ControlGroup>

              <ControlGroup label="Màu sắc & Sắc thái" icon={<Droplets size={14} className="text-indigo-400" />}>
                <Slider label="Độ bão hòa" value={filters.saturation} min={0} max={200} onChange={(v) => handleFilterChange('saturation', v)} onEnd={handleFilterChangeEnd} suffix="%" />
                <Slider label="Sắc độ (Hue)" value={filters.hue} min={0} max={360} onChange={(v) => handleFilterChange('hue', v)} onEnd={handleFilterChangeEnd} suffix="°" />
                <Slider label="Hoài cổ (Sepia)" value={filters.sepia} min={0} max={100} onChange={(v) => handleFilterChange('sepia', v)} onEnd={handleFilterChangeEnd} suffix="%" />
                <Slider label="Đen trắng" value={filters.grayscale} min={0} max={100} onChange={(v) => handleFilterChange('grayscale', v)} onEnd={handleFilterChangeEnd} suffix="%" />
              </ControlGroup>

              <ControlGroup label="Hiệu ứng & Chi tiết" icon={<Layers size={14} className="text-pink-400" />}>
                <Slider label="Độ mờ (Blur)" value={filters.blur} min={0} max={20} onChange={(v) => handleFilterChange('blur', v)} onEnd={handleFilterChangeEnd} suffix="px" />
                <Slider label="Làm tối góc" value={filters.vignette} min={0} max={100} onChange={(v) => handleFilterChange('vignette', v)} onEnd={handleFilterChangeEnd} suffix="%" />
              </ControlGroup>
            </>
          ) : activeTab === 'transform' ? (
            <div className="space-y-8">
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#52525B]">Xoay ảnh</h4>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => {
                      const newRotation = (filters.rotation - 90) % 360;
                      handleFilterChange('rotation', newRotation);
                      handleFilterChangeEnd();
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-[#141417] border border-[#27272A] rounded-xl hover:bg-[#1C1C21] transition-all"
                  >
                    <RotateCcw size={16} />
                    <span className="text-xs font-medium">-90°</span>
                  </button>
                  <button 
                    onClick={() => {
                      const newRotation = (filters.rotation + 90) % 360;
                      handleFilterChange('rotation', newRotation);
                      handleFilterChangeEnd();
                    }}
                    className="flex items-center justify-center gap-2 py-3 bg-[#141417] border border-[#27272A] rounded-xl hover:bg-[#1C1C21] transition-all"
                  >
                    <RotateCw size={16} />
                    <span className="text-xs font-medium">+90°</span>
                  </button>
                </div>
              </div>

              <div className="space-y-4 pt-8 border-t border-[#27272A]">
                <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#52525B]">Cắt ảnh</h4>
                <button 
                  onClick={() => setIsCropMode(true)}
                  className="w-full flex items-center justify-center gap-3 py-4 bg-purple-600/10 border border-purple-500/30 text-purple-500 rounded-xl hover:bg-purple-600/20 transition-all font-bold"
                >
                  <CropIcon size={20} />
                  Mở công cụ cắt ảnh
                </button>
                
                <button 
                  onClick={restoreOriginalImage}
                  className="w-full flex items-center justify-center gap-3 py-3 bg-[#141417] border border-[#27272A] text-[#A1A1AA] rounded-xl hover:bg-[#1C1C21] transition-all text-xs font-semibold"
                >
                  <RotateCcw size={16} />
                  Khôi phục khung ảnh gốc
                </button>

                <p className="text-[10px] text-[#52525B] leading-relaxed text-center">
                  Sử dụng công cụ cắt để thay đổi kích thước hoặc khôi phục lại trạng thái ban đầu của ảnh.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((h, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setImage(h.image);
                    setFilters(h.filters);
                    setImageInfo(h.info);
                    setHistoryIndex(i);
                  }}
                  className={`w-full p-3 rounded-xl border text-left transition-all flex items-center gap-4 ${
                    i === historyIndex 
                      ? 'bg-purple-600/10 border-purple-500' 
                      : 'bg-[#141417] border-[#27272A] hover:border-[#3F3F46]'
                  }`}
                >
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-black border border-white/10 flex-shrink-0">
                    <img src={h.image} className="w-full h-full object-cover" alt={`Step ${i}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-bold truncate ${i === historyIndex ? 'text-purple-500' : 'text-[#FAFAFA]'}`}>
                      {i === 0 ? 'Ảnh gốc' : `Bước chỉnh sửa ${i}`}
                    </p>
                    <p className="text-[10px] text-[#52525B] truncate">
                      {h.info.width} × {h.info.height} PX
                    </p>
                  </div>
                  {i === historyIndex && <Check size={14} className="text-purple-500" />}
                </button>
              ))}
              {history.length > 1 && (
                <button 
                  onClick={() => {
                    if (history.length > 0) {
                      const first = history[0];
                      setHistory([first]);
                      setHistoryIndex(0);
                      setImage(first.image);
                      setFilters(first.filters);
                      setImageInfo(first.info);
                    }
                  }}
                  className="w-full py-3 text-[10px] font-bold uppercase tracking-widest text-red-500/60 hover:text-red-500 transition-colors"
                >
                  Xóa toàn bộ lịch sử
                </button>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 bg-black/60 backdrop-blur-xl">
          <div className="flex items-center justify-between text-[9px] font-mono tracking-widest text-[#52525B]">
            <div className="flex items-center gap-2">
              <div className={`w-1.5 h-1.5 rounded-full ${isProcessing ? 'bg-orange-500' : 'bg-green-500'}`} />
              <span>BPE_HỆ_THỐNG_V3.0</span>
            </div>
            <span className={isProcessing ? "text-orange-500" : "text-green-500"}>{isProcessing ? "ĐANG XỬ LÝ" : "SẴN SÀNG"}</span>
          </div>
        </div>
      </aside>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

function ToolIcon({ icon, active = false, onClick, disabled = false }: { icon: React.ReactNode, active?: boolean, onClick?: () => void, disabled?: boolean }) {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={`p-3 rounded-xl transition-all duration-300 relative group ${
        active 
          ? 'text-purple-500' 
          : 'text-[#52525B] hover:text-[#A1A1AA]'
      } ${disabled ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      {active && (
        <motion.div 
          layoutId="activeTab"
          className="absolute inset-0 bg-purple-600/10 rounded-xl border border-purple-500/20 shadow-[0_0_20px_rgba(139,92,246,0.1)]"
        />
      )}
      <div className="relative z-10">{icon}</div>
    </button>
  );
}

function ControlGroup({ label, icon, children }: { label: string, icon: React.ReactNode, children: React.ReactNode }) {
  return (
    <div className="space-y-6 relative">
      <div className="flex items-center gap-2.5">
        <div className="p-1.5 rounded-lg bg-white/5 border border-white/5 shadow-inner">
          {icon}
        </div>
        <h4 className="text-[9px] font-black uppercase tracking-[0.25em] text-[#52525B]">{label}</h4>
      </div>
      <div className="space-y-6 pl-1 border-l border-white/[0.03] ml-3">
        {children}
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, onChange, onEnd, suffix = "" }: { label: string, value: number, min: number, max: number, onChange: (v: number) => void, onEnd?: () => void, suffix?: string }) {
  return (
    <div className="space-y-3 group">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-bold text-[#71717A] group-hover:text-[#A1A1AA] transition-colors tracking-wide uppercase">{label}</label>
        <div className="px-2 py-0.5 rounded bg-purple-600/10 border border-purple-500/20">
          <span className="text-[10px] font-mono font-bold text-purple-500">{value}{suffix}</span>
        </div>
      </div>
      <div className="relative flex items-center">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value))}
          onMouseUp={onEnd}
          onTouchEnd={onEnd}
          className="w-full h-1 bg-white/5 rounded-full appearance-none cursor-pointer accent-purple-500"
        />
      </div>
    </div>
  );
}

function PresetBox({ label, active = false, onClick }: { label: string, active?: boolean, onClick?: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`aspect-square rounded-lg border flex items-center justify-center text-[10px] font-bold uppercase transition-all ${
        active 
          ? 'bg-purple-600 border-purple-500 text-white' 
          : 'bg-[#141417] border-[#27272A] text-[#52525B] hover:border-[#3F3F46] hover:text-[#A1A1AA]'
      }`}
    >
      {label}
    </button>
  );
}
