
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Map, Move, Ruler, ScanLine, Edit3, ZoomIn, ZoomOut, MousePointer2, 
  Trash2, Box, Layers, Plus, X, Printer,
  AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd, AlignVerticalJustifyStart, AlignVerticalJustifyEnd,
  AlignCenterHorizontal, AlignCenterVertical, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, RotateCw, Palette,
  Tent, TreePine, Armchair, LayoutPanelLeft, DoorOpen, PersonStanding, Speaker, Info, HeartPulse, Flame,
  AlignLeft, AlignCenter, AlignRight, AlignJustify, AlignEndHorizontal, AlignEndVertical,
  MoreHorizontal, Copy, Image as ImageIcon, Scissors, FileCheck, LayoutTemplate,
  Maximize, Minimize, Keyboard, FlipHorizontal, FlipVertical, UserCheck, Undo2,
  Presentation, Utensils, Crown, Settings2, Zap, Wifi, Package
} from 'lucide-react';
import { EventBooking, Stand, UtilitySpace, Pavilion, StandType, UtilityType } from '../types';

interface VisualPlanEditorProps {
  event: EventBooking;
  setEvents: React.Dispatch<React.SetStateAction<EventBooking[]>>;
  activePavilionId: string;
  setActivePavilionId: (id: string) => void;
  selectedStandId: string | null;
  setSelectedStandId: (id: string | null) => void;
  selectedUtilitySpaceId: string | null;
  setSelectedUtilitySpaceId: (id: string | null) => void;
}

const DEFAULT_HALL: Pavilion = { id: 'default', name: 'Hall Principal', type: 'Hall', width: 30, depth: 20, x: 20, y: 20 };
const PIXELS_PER_METER = 40; // Échelle constante : 40px pour 1 mètre

const COLORS = [
  '#ffffff', '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981', 
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#1e293b'
];

// Logic pour couleur selon la taille (Demande utilisateur)
const getStandColorClass = (isOccupied: boolean, area: number) => {
  if (isOccupied) return "bg-slate-900 text-white border-slate-950"; // Occupé = Noir
  
  // Code couleur par taille
  if (area < 9) return "bg-blue-200 text-blue-900 border-blue-800"; // Petit (<9m2)
  if (area < 18) return "bg-emerald-200 text-emerald-900 border-emerald-800"; // Standard (9-18m2)
  if (area < 36) return "bg-amber-200 text-amber-900 border-amber-800"; // Grand (18-36m2)
  return "bg-rose-200 text-rose-900 border-rose-800"; // XXL (>36m2)
};

const getUtilityIcon = (type: UtilityType, className: string = 'w-full h-full') => {
    const props = { className, strokeWidth: 1.5 };
    switch (type) {
        case 'porte': return <DoorOpen {...props} />;
        case 'sanitaire': return <PersonStanding {...props} />;
        case 'scene': return <Speaker {...props} />;
        case 'info': return <Info {...props} />;
        case 'secours': return <HeartPulse {...props} />;
        case 'extincteur': return <Flame {...props} />;
        case 'conference': return <Presentation {...props} />;
        case 'restauration': return <Utensils {...props} />;
        case 'vip': return <Crown {...props} />;
        case 'technique': return <Settings2 {...props} />;
        case 'stockage': return <Package {...props} />;
        case 'electricite': return <Zap {...props} />;
        case 'wifi': return <Wifi {...props} />;
        case 'accueil': return <UserCheck {...props} />;
        default: return <Box {...props} />;
    }
};

const VisualPlanEditor: React.FC<VisualPlanEditorProps> = ({
  event, setEvents, activePavilionId, setActivePavilionId,
  selectedStandId, setSelectedStandId, selectedUtilitySpaceId, setSelectedUtilitySpaceId
}) => {
  const planContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [draggedStandId, setDraggedStandId] = useState<string | null>(null);
  const [draggedUtilitySpaceId, setDraggedUtilitySpaceId] = useState<string | null>(null);
  const [draggedPavilion, setDraggedPavilion] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showPavilionModal, setShowPavilionModal] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // UI states
  const [showPositionMenu, setShowPositionMenu] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  // Multi-selection & History
  const [multiSelection, setMultiSelection] = useState<Set<string>>(new Set());
  const [history, setHistory] = useState<EventBooking[]>([]);
  
  // Ref pour suivre si on a bougé pendant un clic (pour distinguer clic vs drag)
  const hasMovedRef = useRef(false);

  const currentPavilion = (event.pavilions || [DEFAULT_HALL]).find(p => p.id === activePavilionId) || (event.pavilions || [DEFAULT_HALL])[0];
  const selectedStand = event.stands.find(s => s.id === selectedStandId);
  const selectedUtilitySpace = (event.utilitySpaces || []).find(u => u.id === selectedUtilitySpaceId);
  const selectedElement = selectedStand || selectedUtilitySpace;
  const isStandSelected = !!selectedStandId;

  // Sync multiSelection with single selection prop if it's a new single selection
  useEffect(() => {
    if (selectedStandId && !multiSelection.has(selectedStandId)) {
        setMultiSelection(new Set([selectedStandId]));
    } else if (selectedUtilitySpaceId && !multiSelection.has(selectedUtilitySpaceId)) {
        setMultiSelection(new Set([selectedUtilitySpaceId]));
    } else if (!selectedStandId && !selectedUtilitySpaceId && multiSelection.size === 0) {
        // Nothing selected
    }
  }, [selectedStandId, selectedUtilitySpaceId]);

  // Reset menus when selection changes
  useEffect(() => {
    if (!selectedElement) {
        setShowPositionMenu(false);
        setShowColorPicker(false);
    }
  }, [selectedStandId, selectedUtilitySpaceId]);

  const getEffectiveDimensions = (width: number, depth: number, rotation: number = 0) => {
    const normalizedRot = (rotation % 360 + 360) % 360;
    if ((normalizedRot >= 45 && normalizedRot < 135) || (normalizedRot >= 225 && normalizedRot < 315)) {
      return { width: depth, depth: width };
    }
    return { width, depth };
  };

  // Helper pour obtenir la bounding box en Mètres pour un élément donné
  const getBoundingBoxInMeters = (el: any, pavW: number, pavD: number) => {
      const { width: effW, depth: effD } = getEffectiveDimensions(el.width || 3, el.depth || 3, el.rotation || 0);
      const xM = (el.x / 100) * pavW;
      const yM = (el.y / 100) * pavD;
      return {
          id: el.id,
          left: xM,
          right: xM + effW,
          top: yM,
          bottom: yM + effD,
          width: effW,
          height: effD,
          x: xM,
          y: yM
      };
  };

  const getLStandClipPath = (s: Stand) => {
      if (s.shape !== 'L' || !s.cutoutWidth || !s.cutoutDepth) return undefined;
      const width = s.width || 3;
      const depth = s.depth || 3;
      const cutW_Percent = (s.cutoutWidth / width) * 100;
      const cutD_Percent = (s.cutoutDepth / depth) * 100;
      return `polygon(0% 0%, ${100 - cutW_Percent}% 0%, ${100 - cutW_Percent}% ${cutD_Percent}%, 100% ${cutD_Percent}%, 100% 100%, 0% 100%)`;
  };

  // ... (Collisions, Drag & Drop Logic) ...
  const checkCollision = useCallback((
    id: string, xPercent: number, yPercent: number, widthM: number, depthM: number, rotation: number,
    pavilionId: string, stands: Stand[], utilities: UtilitySpace[], pavilion: Pavilion
  ): boolean => {
    const { width: effWidthM, depth: effDepthM } = getEffectiveDimensions(widthM, depthM, rotation);
    const xM = (xPercent / 100) * pavilion.width;
    const yM = (yPercent / 100) * pavilion.depth;
    const r1 = { left: xM, right: xM + effWidthM, top: yM, bottom: yM + effDepthM };

    if (r1.left < -0.01 || r1.top < -0.01 || r1.right > pavilion.width + 0.01 || r1.bottom > pavilion.depth + 0.01) { return true; }

    for (const s of stands) {
        if (s.id === id || s.pavilionId !== pavilionId || s.x === undefined || s.y === undefined) continue;
        const { width: sw, depth: sd } = getEffectiveDimensions(s.width || 3, s.depth || 3, s.rotation || 0);
        const sx = (s.x / 100) * pavilion.width;
        const sy = (s.y / 100) * pavilion.depth;
        const r2 = { left: sx, right: sx + sw, top: sy, bottom: sy + sd };
        if (r1.left < r2.right - 0.01 && r1.right > r2.left + 0.01 && r1.top < r2.bottom - 0.01 && r1.bottom > r2.top + 0.01) { return true; }
    }
    for (const u of utilities) {
        if (u.id === id || u.pavilionId !== pavilionId || u.x === undefined || u.y === undefined) continue;
        const { width: uw, depth: ud } = getEffectiveDimensions(u.width, u.depth, u.rotation || 0);
        const ux = (u.x / 100) * pavilion.width;
        const uy = (u.y / 100) * pavilion.depth;
        const r2 = { left: ux, right: ux + uw, top: uy, bottom: uy + ud };
        if (r1.left < r2.right - 0.01 && r1.right > r2.left + 0.01 && r1.top < r2.bottom - 0.01 && r1.bottom > r2.top + 0.01) { return true; }
    }
    return false;
  }, []);

  // --- HISTORY & UPDATES ---
  const saveToHistory = () => {
      setHistory(prev => {
          const newHist = [...prev, event];
          if (newHist.length > 20) newHist.shift(); // Keep last 20 steps
          return newHist;
      });
  };

  const undo = useCallback(() => {
      setHistory(prev => {
          if (prev.length === 0) return prev;
          const newHist = [...prev];
          const previousEvent = newHist.pop();
          if (previousEvent) {
              setEvents(events => events.map(e => e.id === previousEvent.id ? previousEvent : e));
          }
          return newHist;
      });
  }, [setEvents]);

  const updateEntity = useCallback((updater: (ev: EventBooking) => EventBooking) => {
    saveToHistory();
    setEvents(prev => prev.map(ev => ev.id === event.id ? updater(ev) : ev));
  }, [event.id, setEvents]);

  // --- SELECTION LOGIC ---
  const handleElementClick = (e: React.MouseEvent, id: string, type: 'stand' | 'utility') => {
      e.stopPropagation();
      if (e.ctrlKey || e.metaKey) {
          // Toggle selection
          const newSelection = new Set(multiSelection);
          if (newSelection.has(id)) {
              newSelection.delete(id);
              // If we deselected the primary one, try to set primary to another selected
              if (id === selectedElement?.id) {
                  const next = Array.from(newSelection).pop();
                  if (next) {
                      const isStand = event.stands.find(s => s.id === next);
                      if (isStand) { setSelectedStandId(next); setSelectedUtilitySpaceId(null); }
                      else { setSelectedStandId(null); setSelectedUtilitySpaceId(next); }
                  } else {
                      setSelectedStandId(null); setSelectedUtilitySpaceId(null);
                  }
              }
          } else {
              newSelection.add(id);
              // Make clicked the primary one
              if (type === 'stand') { setSelectedStandId(id); setSelectedUtilitySpaceId(null); }
              else { setSelectedStandId(null); setSelectedUtilitySpaceId(id); }
          }
          setMultiSelection(newSelection);
      } else {
          // Single selection
          if (!multiSelection.has(id) || multiSelection.size > 1) {
              setMultiSelection(new Set([id]));
              if (type === 'stand') { setSelectedStandId(id); setSelectedUtilitySpaceId(null); }
              else { setSelectedStandId(null); setSelectedUtilitySpaceId(id); }
          }
      }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
      if (hasMovedRef.current) return; // If panned, don't deselect
      // Deselect all
      setSelectedStandId(null);
      setSelectedUtilitySpaceId(null);
      setMultiSelection(new Set());
  };

  // --- KEYBOARD SHORTCUTS & ACTIONS ---
  const handleDeleteElement = useCallback(() => {
    if (multiSelection.size === 0) return;
    
    updateEntity(ev => ({
        ...ev,
        stands: ev.stands.map(s => multiSelection.has(s.id) ? { ...s, x: undefined, y: undefined } : s),
        utilitySpaces: (ev.utilitySpaces || []).map(u => multiSelection.has(u.id) ? { ...u, x: undefined, y: undefined } : u)
    }));
    
    setSelectedStandId(null);
    setSelectedUtilitySpaceId(null);
    setMultiSelection(new Set());
  }, [multiSelection, updateEntity, setSelectedStandId, setSelectedUtilitySpaceId]);

  const handleDuplicateElement = useCallback(() => {
    if (multiSelection.size === 0) return;
    const offset = 2;
    
    updateEntity(ev => {
        const newStands = [...ev.stands];
        const newUtilities = [...(ev.utilitySpaces || [])];
        const newSelection = new Set<string>();

        multiSelection.forEach(id => {
            const stand = ev.stands.find(s => s.id === id);
            if (stand) {
                const newS = { ...stand, id: `ST-${Date.now()}-${Math.random()}`, number: `${stand.number}-CPY`, x: (stand.x || 0) + offset, y: (stand.y || 0) + offset, participantId: undefined };
                newStands.push(newS);
                newSelection.add(newS.id);
            }
            const util = (ev.utilitySpaces || []).find(u => u.id === id);
            if (util) {
                const newU = { ...util, id: `util-${Date.now()}-${Math.random()}`, x: (util.x || 0) + offset, y: (util.y || 0) + offset };
                newUtilities.push(newU);
                newSelection.add(newU.id);
            }
        });

        // Set primary to last one
        const lastId = Array.from(newSelection).pop();
        if(lastId) {
             const isS = newStands.find(s => s.id === lastId);
             if(isS) { setSelectedStandId(lastId); setSelectedUtilitySpaceId(null); }
             else { setSelectedStandId(null); setSelectedUtilitySpaceId(lastId || null); }
        }
        setMultiSelection(newSelection); // Update selection to new items

        return { ...ev, stands: newStands, utilitySpaces: newUtilities };
    });
  }, [multiSelection, updateEntity, setSelectedStandId, setSelectedUtilitySpaceId]);

  const handleMoveElement = useCallback((dx: number, dy: number) => {
      if (multiSelection.size === 0) return;
      
      updateEntity(ev => ({
          ...ev,
          stands: ev.stands.map(s => multiSelection.has(s.id) ? { ...s, x: (s.x || 0) + dx, y: (s.y || 0) + dy } : s),
          utilitySpaces: (ev.utilitySpaces || []).map(u => multiSelection.has(u.id) ? { ...u, x: (u.x || 0) + dx, y: (u.y || 0) + dy } : u)
      }));
  }, [multiSelection, updateEntity]);

  const findFreePosition = useCallback((
    width: number,
    depth: number,
    pavilionId: string,
    stands: Stand[],
    utilities: UtilitySpace[],
    pavilion: Pavilion
  ) => {
    const snapM = 0.5;
    const stepX = (snapM / pavilion.width) * 100;
    const stepY = (snapM / pavilion.depth) * 100;

    for (let y = 0; y <= 100; y += stepY) {
      for (let x = 0; x <= 100; x += stepX) {
        if (!checkCollision('new', x, y, width, depth, 0, pavilionId, stands, utilities, pavilion)) {
          return { x, y };
        }
      }
    }

    return { x: 0, y: 0 };
  }, [checkCollision]);

  const addStandQuick = useCallback((shape: 'rect' | 'L' = 'rect') => {
    if (!currentPavilion) return;

    updateEntity(ev => {
      const standsInPav = ev.stands.filter(s => s.pavilionId === activePavilionId && s.x !== undefined);
      const width = 3;
      const depth = 3;
      const position = findFreePosition(width, depth, activePavilionId, ev.stands, ev.utilitySpaces || [], currentPavilion);
      const cutoutWidth = shape === 'L' ? 1 : undefined;
      const cutoutDepth = shape === 'L' ? 1 : undefined;
      const area = shape === 'L' ? (width * depth) - ((cutoutWidth || 0) * (cutoutDepth || 0)) : width * depth;

      const stand: Stand = {
        id: `ST-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        number: `S-${String(standsInPav.length + 1).padStart(3, '0')}`,
        area,
        pricePerSqm: 0,
        type: 'amenage',
        width,
        depth,
        shape,
        cutoutWidth,
        cutoutDepth,
        pavilionId: activePavilionId,
        x: position.x,
        y: position.y,
        color: '#ffffff',
        rotation: 0
      };

      setSelectedStandId(stand.id);
      setSelectedUtilitySpaceId(null);
      setMultiSelection(new Set([stand.id]));

      return { ...ev, stands: [...ev.stands, stand], updatedAt: Date.now() };
    });
  }, [activePavilionId, currentPavilion, findFreePosition, updateEntity, setSelectedStandId, setSelectedUtilitySpaceId]);

  const addUtilityQuick = useCallback((type: UtilityType, label: string) => {
    if (!currentPavilion) return;

    updateEntity(ev => {
      const width = 2;
      const depth = 2;
      const position = findFreePosition(width, depth, activePavilionId, ev.stands, ev.utilitySpaces || [], currentPavilion);

      const utility: UtilitySpace = {
        id: `UTIL-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type,
        label,
        pavilionId: activePavilionId,
        width,
        depth,
        x: position.x,
        y: position.y,
        color: '#f8fafc',
        rotation: 0
      };

      setSelectedStandId(null);
      setSelectedUtilitySpaceId(utility.id);
      setMultiSelection(new Set([utility.id]));

      return { ...ev, utilitySpaces: [...(ev.utilitySpaces || []), utility], updatedAt: Date.now() };
    });
  }, [activePavilionId, currentPavilion, findFreePosition, updateEntity, setSelectedStandId, setSelectedUtilitySpaceId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        // Ignorer si on écrit dans un input
        if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'SELECT') return;

        // Undo
        if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) {
            e.preventDefault();
            undo();
            return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            handleDeleteElement();
        }
        else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            handleDuplicateElement();
        }
        else if (e.key === 'Escape') {
            if (multiSelection.size > 0) {
                setSelectedStandId(null);
                setSelectedUtilitySpaceId(null);
                setMultiSelection(new Set());
            } else if (isFullScreen) {
                setIsFullScreen(false);
            }
        }
        else if (e.key === 'r' || e.key === 'R') {
             if (multiSelection.size > 0) {
                 updateEntity(ev => ({
                     ...ev,
                     stands: ev.stands.map(s => multiSelection.has(s.id) ? { ...s, rotation: (s.rotation || 0) + 90 } : s),
                     utilitySpaces: (ev.utilitySpaces || []).map(u => multiSelection.has(u.id) ? { ...u, rotation: (u.rotation || 0) + 90 } : u)
                 }));
             }
        }
        else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'L' || e.key === 'l')) {
            e.preventDefault();
            addStandQuick('L');
        }
        else if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'R' || e.key === 'r')) {
            e.preventDefault();
            addStandQuick('rect');
        }
        else if (e.key === '+' || e.key === '=') {
            e.preventDefault();
            setTransform(t => ({ ...t, scale: Math.min(t.scale + 0.2, 4) }));
        }
        else if (e.key === '-') {
            e.preventDefault();
            setTransform(t => ({ ...t, scale: Math.max(t.scale - 0.2, 0.2) }));
        }
        else if (e.key === '0') {
            e.preventDefault();
            setTransform({ x: 0, y: 0, scale: 1 });
        }
        else if (e.code === 'Space') {
            setIsSpacePressed(true);
        }
        else if (multiSelection.size > 0 && currentPavilion) {
            // 1 flèche = 1 mètre (ou 0.1m si Shift maintenu pour précision)
            const meters = e.shiftKey ? 0.1 : 1; 
            
            // Conversion Mètres -> Pourcentage du plan (car x/y sont stockés en %)
            const pWidth = currentPavilion.width || 30;
            const pDepth = currentPavilion.depth || 20;

            const stepX = (meters / pWidth) * 100;
            const stepY = (meters / pDepth) * 100;

            if (e.key === 'ArrowUp') { e.preventDefault(); handleMoveElement(0, -stepY); }
            if (e.key === 'ArrowDown') { e.preventDefault(); handleMoveElement(0, stepY); }
            if (e.key === 'ArrowLeft') { e.preventDefault(); handleMoveElement(-stepX, 0); }
            if (e.key === 'ArrowRight') { e.preventDefault(); handleMoveElement(stepX, 0); }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [multiSelection, isFullScreen, selectedElement, history, currentPavilion, undo, handleDeleteElement, handleDuplicateElement, updateEntity, setSelectedStandId, setSelectedUtilitySpaceId, setMultiSelection, setIsFullScreen, handleMoveElement, selectedStandId, selectedUtilitySpaceId, addStandQuick]);

  useEffect(() => {
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') setIsSpacePressed(false);
    };

    window.addEventListener('keyup', onKeyUp);
    return () => window.removeEventListener('keyup', onKeyUp);
  }, []);


  // ... (Drag Handler Logic) ...
  const handlePlanDrop = (e: React.DragEvent, pavId: string) => {
    e.preventDefault();
    const pavilion = (event.pavilions || []).find(p => p.id === pavId);
    if (!pavilion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    const snapM = 0.5;
    const snapStepX = (snapM / pavilion.width) * 100;
    const snapStepY = (snapM / pavilion.depth) * 100;
    const snappedX = Math.round(xPercent / snapStepX) * snapStepX;
    const snappedY = Math.round(yPercent / snapStepY) * snapStepY;

    if (draggedStandId) {
      const stand = event.stands.find(s => s.id === draggedStandId);
      if (stand) {
        if (!checkCollision(stand.id, snappedX, snappedY, stand.width || 3, stand.depth || 3, stand.rotation || 0, pavId, event.stands, event.utilitySpaces || [], pavilion)) {
          updateEntity(ev => ({ ...ev, stands: ev.stands.map(s => s.id === draggedStandId ? { ...s, x: snappedX, y: snappedY, pavilionId: pavId } : s), updatedAt: Date.now() }));
          setSelectedStandId(draggedStandId);
          setMultiSelection(new Set([draggedStandId]));
        }
      }
      setDraggedStandId(null);
    } else if (draggedUtilitySpaceId) {
      const space = (event.utilitySpaces || []).find(s => s.id === draggedUtilitySpaceId);
      if (space) {
        if (!checkCollision(space.id, snappedX, snappedY, space.width, space.depth, space.rotation || 0, pavId, event.stands, event.utilitySpaces || [], pavilion)) {
          updateEntity(ev => ({ ...ev, utilitySpaces: (ev.utilitySpaces || []).map(obj => obj.id === draggedUtilitySpaceId ? { ...obj, x: snappedX, y: snappedY, pavilionId: pavId } : obj), updatedAt: Date.now() }));
          setSelectedUtilitySpaceId(draggedUtilitySpaceId);
          setMultiSelection(new Set([draggedUtilitySpaceId]));
        }
      }
      setDraggedUtilitySpaceId(null);
    }
  };

  const updateElementProperty = (prop: string, value: any) => {
      if (!selectedElement || !currentPavilion) return;
      let updates: any = {};
      updates[prop] = value;
      
      updateEntity(ev => ({
          ...ev,
          stands: ev.stands.map(s => {
              if (multiSelection.has(s.id)) {
                  const updatedStand = { ...s, ...updates };
                  // Recalculate area if dimensions changed
                  if (['width', 'depth', 'shape', 'cutoutWidth', 'cutoutDepth'].includes(prop)) {
                      let newArea = (updatedStand.width || 0) * (updatedStand.depth || 0);
                      if (updatedStand.shape === 'L') {
                          newArea -= (updatedStand.cutoutWidth || 0) * (updatedStand.cutoutDepth || 0);
                      }
                      updatedStand.area = parseFloat(Math.max(0, newArea).toFixed(2));
                  }
                  return updatedStand;
              }
              return s;
          }),
          utilitySpaces: (ev.utilitySpaces || []).map(u => multiSelection.has(u.id) ? { ...u, ...updates } : u),
          updatedAt: Date.now()
      }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isStandSelected) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateElementProperty('customLogoUrl', reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- SMART ALIGNMENT (MAGNETIC SLIDE) ---
  const alignElement = (action: string) => {
    if (!selectedElement || !currentPavilion || multiSelection.size === 0) return;
    
    const pavW = currentPavilion.width;
    const pavD = currentPavilion.depth;
    
    // Obtenir tous les obstacles (tout sauf ceux de la sélection)
    const obstacles = [
        ...event.stands.filter(s => !multiSelection.has(s.id) && s.pavilionId === activePavilionId && s.x !== undefined),
        ...(event.utilitySpaces || []).filter(u => !multiSelection.has(u.id) && u.pavilionId === activePavilionId && u.x !== undefined)
    ].map(o => getBoundingBoxInMeters(o, pavW, pavD));

    const TOLERANCE = 0.1;

    // Calculer les nouvelles positions pour TOUS les éléments sélectionnés
    const changes: {id: string, x?: number, y?: number}[] = [];

    // On itère sur chaque élément sélectionné pour calculer son alignement individuel
    // (Note: dans certains logiciels on aligne le groupe, ici on aligne chaque élément individuellement à son plus proche voisin/mur)
    [...event.stands, ...(event.utilitySpaces || [])].forEach(el => {
        if (!multiSelection.has(el.id)) return;
        
        const selBox = getBoundingBoxInMeters(el, pavW, pavD);
        let newX_M = selBox.left;
        let newY_M = selBox.top;

        if (action === 'left') {
            const candidates = obstacles.filter(o => 
                o.right <= selBox.left + TOLERANCE && 
                !(o.bottom <= selBox.top + TOLERANCE || o.top >= selBox.bottom - TOLERANCE)
            );
            if (candidates.length > 0) newX_M = Math.max(...candidates.map(o => o.right));
            else newX_M = 0;
        } 
        else if (action === 'right') {
            const candidates = obstacles.filter(o => 
                o.left >= selBox.right - TOLERANCE &&
                !(o.bottom <= selBox.top + TOLERANCE || o.top >= selBox.bottom - TOLERANCE)
            );
            if (candidates.length > 0) newX_M = Math.min(...candidates.map(o => o.left)) - selBox.width;
            else newX_M = pavW - selBox.width;
        }
        else if (action === 'top') {
            const candidates = obstacles.filter(o => 
                o.bottom <= selBox.top + TOLERANCE &&
                !(o.right <= selBox.left + TOLERANCE || o.left >= selBox.right - TOLERANCE)
            );
            if (candidates.length > 0) newY_M = Math.max(...candidates.map(o => o.bottom));
            else newY_M = 0;
        }
        else if (action === 'bottom') {
            const candidates = obstacles.filter(o => 
                o.top >= selBox.bottom - TOLERANCE &&
                !(o.right <= selBox.left + TOLERANCE || o.left >= selBox.right - TOLERANCE)
            );
            if (candidates.length > 0) newY_M = Math.min(...candidates.map(o => o.top)) - selBox.height;
            else newY_M = pavD - selBox.height;
        }
        else if (action === 'center-x') { newX_M = (pavW - selBox.width) / 2; }
        else if (action === 'center-y') { newY_M = (pavD - selBox.height) / 2; }

        // Convert back to %
        changes.push({
            id: el.id,
            x: (newX_M / pavW) * 100,
            y: (newY_M / pavD) * 100
        });
    });
    
    updateEntity(ev => {
        let newStands = [...ev.stands];
        let newUtils = [...(ev.utilitySpaces || [])];
        
        changes.forEach(c => {
            newStands = newStands.map(s => s.id === c.id ? { ...s, x: c.x, y: c.y } : s);
            newUtils = newUtils.map(u => u.id === c.id ? { ...u, x: c.x, y: c.y } : u);
        });

        return { ...ev, stands: newStands, utilitySpaces: newUtils, updatedAt: Date.now() };
    });
  };

  const getUiValue = (prop: 'x' | 'y') => {
      if (!selectedElement || !currentPavilion) return 0;
      const val = selectedElement[prop] || 0;
      const dim = prop === 'x' ? currentPavilion.width : currentPavilion.depth;
      return parseFloat(((val / 100) * dim).toFixed(2));
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (draggedPavilion) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const scaleAmount = 1.1;
    const newScale = e.deltaY < 0 ? transform.scale * scaleAmount : transform.scale / scaleAmount;
    const clampedScale = Math.max(0.2, Math.min(5, newScale));
    const worldX = (mouseX - transform.x) / transform.scale;
    const worldY = (mouseY - transform.y) / transform.scale;
    setTransform({ x: mouseX - worldX * clampedScale, y: mouseY - worldY * clampedScale, scale: clampedScale });
  };

  // --- PRINT PREVIEW COMPONENT ---
  const PrintPreviewModal = () => {
    const activeStands = event.stands.filter(s => s.pavilionId === activePavilionId && s.x !== undefined);
    const activeUtils = (event.utilitySpaces || []).filter(u => u.pavilionId === activePavilionId && u.x !== undefined);
    
    // Generate Legend Data
    const standTypes = [
      { label: '< 9m² (Petit)', colorClass: 'bg-blue-200 border-blue-800' },
      { label: '9-18m² (Moyen)', colorClass: 'bg-emerald-200 border-emerald-800' },
      { label: '18-36m² (Grand)', colorClass: 'bg-amber-200 border-amber-800' },
      { label: '> 36m² (XXL)', colorClass: 'bg-rose-200 border-rose-800' },
      { label: 'Occupé', colorClass: 'bg-slate-900 border-slate-950' }
    ];
    const utilTypes = Array.from(new Set(activeUtils.map(u => u.type))).map(t => ({ type: t, label: t }));

    return (
      <div className="fixed inset-0 z-[200] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-4 print:p-0 print:bg-white print:static">
         <div className="bg-white w-full max-w-[29.7cm] h-[90vh] md:aspect-[1.414/1] md:h-auto rounded-none md:rounded-lg shadow-2xl overflow-hidden flex flex-col print:shadow-none print:w-full print:h-full print:max-w-none print:aspect-auto relative print:border-none">
            
            {/* Toolbar (Hidden on Print) */}
            <div className="bg-slate-800 text-white p-4 flex justify-between items-center print:hidden">
               <h3 className="font-black uppercase tracking-widest flex items-center"><Printer size={20} className="mr-3"/> Aperçu Impression</h3>
               <div className="flex space-x-3">
                  <button onClick={() => setShowPrintPreview(false)} className="px-4 py-2 hover:bg-white/10 rounded-lg text-xs font-bold uppercase">Fermer</button>
                  <button onClick={() => window.print()} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-xs font-bold uppercase shadow-lg flex items-center"><FileCheck size={16} className="mr-2"/> Lancer l'impression</button>
               </div>
            </div>

            {/* Printable Content */}
            <div id="printable-section" className="flex-1 flex flex-col p-8 print:p-0 relative">
                {/* Header */}
                <div className="flex justify-between items-start border-b-4 border-slate-900 pb-6 mb-6">
                    <div className="flex items-center space-x-6">
                        {event.logoUrl ? <img src={event.logoUrl} className="w-24 h-24 object-contain" alt="Event Logo" /> : <div className="w-24 h-24 bg-slate-100 flex items-center justify-center font-black text-2xl">LOGO</div>}
                        <div>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900">{event.title}</h1>
                            <p className="text-sm font-bold uppercase tracking-widest text-slate-500">{event.theme || 'Plan Général'}</p>
                            <p className="text-[10px] font-mono mt-2 text-slate-400">ID: {event.id}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <h2 className="text-2xl font-black uppercase text-indigo-600">{currentPavilion.name}</h2>
                        <div className="bg-slate-900 text-white px-4 py-1 inline-block text-xs font-black uppercase mt-2">{currentPavilion.type === 'Outdoor' ? 'Espace Externe' : 'Hall Intérieur'}</div>
                        <p className="text-[10px] font-bold mt-2">Dimensions: {currentPavilion.width}m x {currentPavilion.depth}m</p>
                    </div>
                </div>

                {/* Plan Area (Auto Scaled) */}
                <div className="flex-1 relative border-2 border-slate-900 bg-slate-50 overflow-hidden print:border-black print:bg-white">
                    <div className="absolute inset-0 w-full h-full">
                        {activeStands.map(s => {
                            const wP = ((s.width || 3) / currentPavilion.width) * 100;
                            const hP = ((s.depth || 3) / currentPavilion.depth) * 100;
                            const clipPath = getLStandClipPath(s);
                            const isChapiteau = s.type === 'chapiteau';
                            
                            // Visual Transforms including Flip
                            const flipX = (s as any).flipX ? -1 : 1;
                            const flipY = (s as any).flipY ? -1 : 1;
                            
                            return (
                                <div key={s.id} style={{ 
                                    top: `${s.y}%`, left: `${s.x}%`, width: `${wP}%`, height: `${hP}%`, 
                                    transform: `rotate(${s.rotation || 0}deg) scaleX(${flipX}) scaleY(${flipY})`, 
                                    backgroundColor: s.color,
                                    clipPath: clipPath,
                                    boxShadow: clipPath ? 'none' : 'inset 0 0 0 1px rgba(0,0,0,0.5)',
                                    backgroundImage: isChapiteau ? 'linear-gradient(45deg, transparent 48%, rgba(0,0,0,0.2) 49%, rgba(0,0,0,0.2) 51%, transparent 52%), linear-gradient(-45deg, transparent 48%, rgba(0,0,0,0.2) 49%, rgba(0,0,0,0.2) 51%, transparent 52%)' : 'none'
                                }} className={`absolute flex items-center justify-center text-center z-10 print:border-2 print:border-black border-2 ${!clipPath ? '' : ''} ${getStandColorClass(!!s.participantId, s.area)}`}>
                                    {/* Counter-Transform for Text readability */}
                                    <span style={{ transform: `scaleX(${flipX}) scaleY(${flipY}) rotate(-${s.rotation || 0}deg)` }} className="text-xs md:text-sm font-black leading-tight select-none pointer-events-none z-10 relative bg-white/70 px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm print:text-black print:bg-white/70 print:shadow-none">{s.number}<br/><span className="text-[10px] opacity-80">{Number(s.area).toFixed(2)}m²</span></span>
                                    {s.customLogoUrl && <img src={s.customLogoUrl} style={{ transform: `scaleX(${flipX}) scaleY(${flipY}) rotate(-${s.rotation || 0}deg)` }} className="absolute inset-0 w-full h-full object-contain opacity-30" />}
                                </div>
                            );
                        })}
                        {activeUtils.map(u => {
                            const wP = (u.width / currentPavilion.width) * 100;
                            const hP = (u.depth / currentPavilion.depth) * 100;
                            // Visual Transforms including Flip
                            const flipX = (u as any).flipX ? -1 : 1;
                            const flipY = (u as any).flipY ? -1 : 1;

                            return (
                                <div key={u.id} style={{ top: `${u.y}%`, left: `${u.x}%`, width: `${wP}%`, height: `${hP}%`, transform: `rotate(${u.rotation || 0}deg) scaleX(${flipX}) scaleY(${flipY})`, backgroundColor: u.color }} className="absolute z-20 flex items-center justify-center border-2 border-slate-500 bg-white/80 print:border-black">
                                    <div style={{ transform: `scaleX(${flipX}) scaleY(${flipY}) rotate(-${u.rotation || 0}deg)`, width: '100%', height: '100%', padding: '2px' }}>
                                      {getUtilityIcon(u.type, "text-slate-900 w-full h-full p-0.5")}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Scale Indicator */}
                    <div className="absolute bottom-2 left-2 bg-white/80 px-2 py-1 text-[8px] font-mono border border-black">Echelle 1:100 (Approx)</div>
                </div>

                {/* Generated Legend */}
                <div className="mt-6 pt-4 border-t-2 border-slate-900 grid grid-cols-4 gap-4 text-[9px]">
                    <div className="col-span-3">
                        <h4 className="font-black uppercase mb-2">Légende des Stands</h4>
                        <div className="grid grid-cols-3 gap-2">
                            {standTypes.map(st => (
                                <div key={st.label} className="flex items-center">
                                    <div className={`w-3 h-3 border mr-2 ${st.colorClass}`}></div>
                                    <span className="uppercase font-bold">{st.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div>
                        <h4 className="font-black uppercase mb-2">Utilitaires</h4>
                        <div className="grid grid-cols-2 gap-2">
                            {utilTypes.map(ut => (
                                <div key={ut.type} className="flex items-center">
                                    <div className="w-3 h-3 mr-2">{getUtilityIcon(ut.type as any)}</div>
                                    <span className="uppercase font-bold">{ut.type}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="mt-4 flex justify-between items-end text-[8px] uppercase text-slate-500 font-bold border-t border-slate-200 pt-2">
                    <p>Généré par DZ-Manager ERP • {new Date().toLocaleString()}</p>
                    <p>Page 1 / 1</p>
                </div>
            </div>
            
            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    #printable-section, #printable-section * { visibility: visible; }
                    #printable-section { position: absolute; left: 0; top: 0; width: 100%; height: 100%; margin: 0; padding: 20px; background: white; }
                    @page { size: landscape; margin: 0; }
                }
            `}</style>
         </div>
      </div>
    );
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-4 gap-8 h-full animate-in fade-in duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-white dark:bg-slate-900 p-6' : ''}`}>
      {/* Existing Toolbar (Left Column) */}
      <div className="lg:col-span-1 space-y-6 flex flex-col h-full no-print">
         <div className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b pb-2 flex items-center"><Ruler size={14} className="mr-2"/> Dimensions Pavillon</h4>
            <div className="grid grid-cols-2 gap-4">
               <div><label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Largeur (m)</label><input type="number" value={currentPavilion.width} onChange={e => updateEntity(ev => ({ ...ev, pavilions: (ev.pavilions || [DEFAULT_HALL]).map(p => p.id === activePavilionId ? { ...p, width: parseInt(e.target.value) || 20 } : p) }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-xl font-black text-sm outline-none focus:border-indigo-600" /></div>
               <div><label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Prof. (m)</label><input type="number" value={currentPavilion.depth} onChange={e => updateEntity(ev => ({ ...ev, pavilions: (ev.pavilions || [DEFAULT_HALL]).map(p => p.id === activePavilionId ? { ...p, depth: parseInt(e.target.value) || 20 } : p) }))} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-xl font-black text-sm outline-none focus:border-indigo-600" /></div>
            </div>
            <div className="flex flex-col gap-2 max-h-40 overflow-y-auto no-scrollbar pr-1">
               {(event.pavilions || [DEFAULT_HALL]).map(pav => (
                   <div key={pav.id} onClick={() => setActivePavilionId(pav.id)} className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${activePavilionId === pav.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400'}`}>
                       <span className="text-[10px] font-black uppercase truncate">{pav.name}</span>
                       <button onClick={(e) => {e.stopPropagation(); updateEntity(ev => ({ ...ev, pavilions: (ev.pavilions || []).filter(p => p.id !== pav.id) }))}} className="p-1 hover:bg-white/20 rounded text-inherit"><Trash2 size={12}/></button>
                   </div>
               ))}
               <button onClick={() => setShowPavilionModal(true)} className="flex items-center justify-center p-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 hover:text-indigo-500 transition-all text-[10px] font-black uppercase"><Plus size={14} className="mr-1"/> Nouveau Hall</button>
            </div>
         </div>

         {selectedStand ? (
           <div className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-indigo-200 dark:border-indigo-900 shadow-md animate-in zoom-in-95 space-y-4">
              <div className="flex justify-between items-center border-b pb-2 border-slate-100 dark:border-slate-800">
                  <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Édition Stand</h4>
                  <button onClick={() => setSelectedStandId(null)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all"><X size={14} /></button>
              </div>
              
              <div className="mb-2">
                 <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Numéro de Stand</label>
                 <input 
                   type="text" 
                   value={selectedStand.number} 
                   onChange={(e) => updateElementProperty('number', e.target.value)}
                   className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-xl font-black text-sm outline-none focus:border-indigo-600 uppercase"
                 />
              </div>

              <div className="mb-4">
                 <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 mb-1 block">Locataire / Exposant</label>
                 <div className="relative">
                     <UserCheck size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-500" />
                     <select
                         value={selectedStand.participantId || ''}
                         onChange={(e) => updateElementProperty('participantId', e.target.value || undefined)}
                         className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border-2 border-transparent dark:border-slate-700 rounded-xl font-bold text-xs outline-none focus:border-indigo-600 text-slate-700 dark:text-slate-200"
                     >
                         <option value="">-- Stand Libre --</option>
                         {event.participants.map(p => (
                             <option key={p.clientId} value={p.clientId}>
                                 {p.clientName}
                             </option>
                         ))}
                     </select>
                 </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-2xl text-center border border-slate-100 dark:border-slate-700">
                      <span className="text-[9px] font-black text-slate-400 uppercase block">Surface</span>
                      <span className="text-lg font-black text-slate-700 dark:text-slate-200">{selectedStand.area} m²</span>
                  </div>
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-2xl text-center border border-emerald-100 dark:border-emerald-800 group cursor-text relative">
                      <span className="text-[9px] font-black text-emerald-600/70 uppercase block group-hover:text-emerald-600 transition-colors">Prix / m²</span>
                      <div className="flex items-center justify-center">
                          <input 
                            type="number" 
                            value={selectedStand.pricePerSqm} 
                            onChange={(e) => updateElementProperty('pricePerSqm', parseFloat(e.target.value) || 0)}
                            className="w-full bg-transparent text-lg font-black text-emerald-600 text-center outline-none"
                          />
                      </div>
                  </div>
              </div>

              <div className="bg-slate-900 dark:bg-slate-950 p-4 rounded-2xl flex justify-between items-center text-white shadow-lg">
                  <span className="text-[9px] font-black text-indigo-300 uppercase">Total Estimé</span>
                  <span className="text-lg font-black tracking-tight">{(selectedStand.area * selectedStand.pricePerSqm).toLocaleString('fr-DZ', { style: 'currency', currency: 'DZD', maximumFractionDigits: 0 })}</span>
              </div>

              <p className="text-[9px] text-slate-400 text-center uppercase">Utilisez la barre d'outils supérieure pour positionner</p>
           </div>
         ) : (
          <div className="p-6 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 shadow-sm flex-1 flex flex-col min-h-[150px]">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center"><ScanLine size={14} className="mr-2"/> Éléments non placés</h4>
            <div className="flex-1 overflow-y-auto space-y-3 no-scrollbar pr-2">
               {event.stands.filter(s => s.pavilionId === activePavilionId && (s.x === undefined || s.y === undefined)).map(s => (
                 <div key={s.id} draggable onDragStart={(e) => { setDraggedStandId(s.id); e.dataTransfer.effectAllowed = "move"; setSelectedStandId(s.id); }} className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 rounded-2xl cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-all group shadow-sm flex justify-between items-center">
                    <span className="text-xs font-black">Stand {s.number}</span>
                    <Move size={12} className="text-slate-300" />
                 </div>
               ))}
               {(event.utilitySpaces || []).filter(u => u.pavilionId === activePavilionId && (u.x === undefined || u.y === undefined)).map(u => (
                 <div key={u.id} draggable onDragStart={(e) => { setDraggedUtilitySpaceId(u.id); e.dataTransfer.effectAllowed = "move"; setSelectedUtilitySpaceId(u.id); }} className="p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 rounded-2xl cursor-grab active:cursor-grabbing hover:border-indigo-500 transition-all group shadow-sm flex justify-between items-center">
                    <span className="text-xs font-black uppercase flex items-center">{getUtilityIcon(u.type, "w-4 h-4 mr-2")} {u.label}</span>
                    <Move size={12} className="text-slate-300" />
                 </div>
               ))}
            </div>
          </div>
         )}
         
         <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-[24px] border border-slate-200 dark:border-slate-700">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center"><Keyboard size={12} className="mr-2"/> Raccourcis</h4>
            <ul className="text-[9px] font-bold text-slate-500 space-y-1">
                <li className="flex justify-between"><span>Annuler</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">Ctrl+Z</span></li>
                <li className="flex justify-between"><span>Sélection Multi</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">Ctrl+Clic</span></li>
                <li className="flex justify-between"><span>Supprimer</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">Del</span></li>
                <li className="flex justify-between"><span>Dupliquer</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">Ctrl+D</span></li>
                <li className="flex justify-between"><span>Déplacer</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">Flèches</span></li>
                <li className="flex justify-between"><span>Nouv. stand rect</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">Ctrl+Shift+R</span></li>
                <li className="flex justify-between"><span>Nouv. stand L</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">Ctrl+Shift+L</span></li>
                <li className="flex justify-between"><span>Zoom</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">+ / -</span></li>
                <li className="flex justify-between"><span>Reset vue</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">0</span></li>
                <li className="flex justify-between"><span>Pan souris</span> <span className="bg-white dark:bg-slate-900 px-1 rounded border">Espace + Drag</span></li>
            </ul>
         </div>
      </div>

      <div className="lg:col-span-3 bg-slate-200 dark:bg-black/40 rounded-[40px] border-4 border-slate-300 relative overflow-hidden flex flex-col print:border-none print:bg-white print:overflow-visible">
         {/* CANVA-STYLE TOP TOOLBAR */}
         <div className="absolute top-3 left-3 z-30 bg-white/95 dark:bg-slate-900/95 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl p-2 flex flex-wrap gap-2 no-print">
            <button onClick={() => addStandQuick('rect')} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 flex items-center"><Box size={14} className="mr-2"/> Stand Rect</button>
            <button onClick={() => addStandQuick('L')} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 flex items-center"><LayoutTemplate size={14} className="mr-2"/> Stand L</button>
            <button onClick={() => addUtilityQuick('porte', 'Porte')} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 flex items-center"><DoorOpen size={14} className="mr-2"/> Porte</button>
            <button onClick={() => addUtilityQuick('sanitaire', 'Sanitaire')} className="px-3 py-2 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 flex items-center"><PersonStanding size={14} className="mr-2"/> Sanitaire</button>
         </div>

         {selectedElement && (
            <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-0 left-0 right-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-3 flex items-center justify-between shadow-sm animate-in slide-in-from-top-2 no-print">
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2 border-r border-slate-200 dark:border-slate-700 pr-4">
                        {multiSelection.size > 1 ? (
                            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                                {multiSelection.size} éléments sélectionnés
                            </span>
                        ) : (
                            <>
                                <span className="w-4 h-4 rounded bg-indigo-500 block"></span>
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase">
                                    {isStandSelected ? `Stand ${(selectedElement as Stand).number}` : (selectedElement as UtilitySpace).label}
                                </span>
                            </>
                        )}
                    </div>
                    
                    <button onClick={() => setShowPositionMenu(!showPositionMenu)} className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center ${showPositionMenu ? 'bg-slate-100 dark:bg-slate-800 text-indigo-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400'}`}>
                        <LayoutPanelLeft size={16} className="mr-2" /> Position
                    </button>

                    <div className="relative">
                        <button onClick={() => setShowColorPicker(!showColorPicker)} className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                            <Palette size={16} className="mr-2" /> Couleur
                        </button>
                        {showColorPicker && (
                            <div className="absolute top-full left-0 mt-2 p-3 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 grid grid-cols-4 gap-2 z-50">
                                {COLORS.map(c => (
                                    <button key={c} onClick={() => { updateElementProperty('color', c); setShowColorPicker(false); }} className="w-6 h-6 rounded-full border border-slate-200" style={{ backgroundColor: c }} />
                                ))}
                            </div>
                        )}
                    </div>

                    {isStandSelected && multiSelection.size === 1 && (
                        <>
                            <div className="relative">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                                    <ImageIcon size={16} className="mr-2" /> Logo
                                </button>
                            </div>
                            <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1">
                                    <span className="text-[9px] font-black text-slate-400 mr-2">Prix/m²</span>
                                    <input type="number" className="w-16 bg-transparent text-xs font-bold outline-none text-right" value={(selectedElement as Stand).pricePerSqm} onChange={(e) => updateElementProperty('pricePerSqm', parseFloat(e.target.value) || 0)} />
                                </div>
                            </div>
                        </>
                    )}

                    <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1">
                            <span className="text-[9px] font-black text-slate-400 mr-2">W</span>
                            <input type="number" className="w-10 bg-transparent text-xs font-bold outline-none text-right" value={selectedElement.width} onChange={(e) => updateElementProperty('width', parseFloat(e.target.value) || 1)} />
                        </div>
                        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1">
                            <span className="text-[9px] font-black text-slate-400 mr-2">H</span>
                            <input type="number" className="w-10 bg-transparent text-xs font-bold outline-none text-right" value={selectedElement.depth} onChange={(e) => updateElementProperty('depth', parseFloat(e.target.value) || 1)} />
                        </div>
                        
                        {isStandSelected && (selectedElement as Stand).shape === 'L' && (
                            <div className="flex items-center space-x-2 border-l border-slate-200 dark:border-slate-700 pl-4">
                                <Scissors size={14} className="text-slate-400 mr-1" />
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1" title="Largeur Découpe L">
                                    <span className="text-[9px] font-black text-slate-400 mr-1">L</span>
                                    <input type="number" className="w-10 bg-transparent text-xs font-bold outline-none text-right" value={(selectedElement as Stand).cutoutWidth} onChange={(e) => updateElementProperty('cutoutWidth', parseFloat(e.target.value) || 0)} />
                                </div>
                                <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg px-2 py-1" title="Profondeur Découpe L">
                                    <span className="text-[9px] font-black text-slate-400 mr-1">P</span>
                                    <input type="number" className="w-10 bg-transparent text-xs font-bold outline-none text-right" value={(selectedElement as Stand).cutoutDepth} onChange={(e) => updateElementProperty('cutoutDepth', parseFloat(e.target.value) || 0)} />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center space-x-2">
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Flip Horizontal" onClick={() => updateElementProperty('flipX', !(selectedElement as any).flipX)}><FlipHorizontal size={16} /></button>
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Flip Vertical" onClick={() => updateElementProperty('flipY', !(selectedElement as any).flipY)}><FlipVertical size={16} /></button>
                    <button className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-500" title="Rotation (R)">
                        <RotateCw size={16} onClick={() => updateElementProperty('rotation', (selectedElement.rotation || 0) + 90)} />
                    </button>
                    <button 
                        className="p-2 hover:bg-rose-50 text-rose-500 rounded-lg" 
                        title="Supprimer (Del)"
                        onClick={handleDeleteElement}
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>
         )}

         {/* POSITION MENU SIDEBAR (CANVA STYLE) */}
         {showPositionMenu && selectedElement && (
             <div onMouseDown={(e) => e.stopPropagation()} className="absolute top-[60px] left-4 z-30 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 w-80 animate-in slide-in-from-left-4 fade-in duration-200 flex flex-col overflow-hidden no-print">
                 <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                     <h3 className="text-xs font-black uppercase text-slate-900 dark:text-white">Alignement Magnétique</h3>
                     <button onClick={() => setShowPositionMenu(false)} className="hover:bg-slate-100 dark:hover:bg-slate-800 p-1 rounded-full"><X size={14}/></button>
                 </div>
                 
                 <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                     <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Glisser vers obstacle</p>
                         <div className="grid grid-cols-3 gap-2">
                             {[
                                 { label: 'Haut', icon: <AlignVerticalJustifyStart size={16} />, action: 'top' },
                                 { label: 'Centre Y', icon: <AlignJustify size={16} className="rotate-90" />, action: 'center-y' },
                                 { label: 'Bas', icon: <AlignVerticalJustifyEnd size={16} />, action: 'bottom' },
                                 { label: 'Gauche', icon: <AlignLeft size={16} />, action: 'left' },
                                 { label: 'Centre X', icon: <AlignCenter size={16} />, action: 'center-x' },
                                 { label: 'Droite', icon: <AlignRight size={16} />, action: 'right' },
                             ].map((opt: any) => (
                                 <button 
                                    key={opt.label} 
                                    onClick={() => alignElement(opt.action)}
                                    className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 transition-all border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900"
                                 >
                                     {opt.icon}
                                     <span className="text-[9px] font-bold mt-1">{opt.label}</span>
                                 </button>
                             ))}
                         </div>
                     </div>

                     <div>
                         <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">Avancé (Mètres)</p>
                         <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                                 <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Pos X</label>
                                 <input type="number" step="0.5" value={getUiValue('x')} onChange={(e) => updateElementProperty('x', ((parseFloat(e.target.value) || 0) / currentPavilion.width) * 100)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black outline-none focus:border-indigo-600" />
                             </div>
                             <div className="space-y-1">
                                 <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Pos Y</label>
                                 <input type="number" step="0.5" value={getUiValue('y')} onChange={(e) => updateElementProperty('y', ((parseFloat(e.target.value) || 0) / currentPavilion.depth) * 100)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black outline-none focus:border-indigo-600" />
                             </div>
                             <div className="space-y-1">
                                 <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Largeur</label>
                                 <input type="number" value={selectedElement.width} onChange={(e) => updateElementProperty('width', parseFloat(e.target.value) || 1)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black outline-none focus:border-indigo-600" />
                             </div>
                             <div className="space-y-1">
                                 <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Profondeur</label>
                                 <input type="number" value={selectedElement.depth} onChange={(e) => updateElementProperty('depth', parseFloat(e.target.value) || 1)} className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black outline-none focus:border-indigo-600" />
                             </div>
                             <div className="col-span-2 space-y-1">
                                 <label className="text-[9px] font-bold text-slate-500 uppercase ml-1">Rotation (°)</label>
                                 <div className="flex items-center space-x-2">
                                     <input type="number" value={selectedElement.rotation || 0} onChange={(e) => updateElementProperty('rotation', parseFloat(e.target.value) || 0)} className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl text-xs font-black outline-none focus:border-indigo-600" />
                                     <button onClick={() => updateElementProperty('rotation', (selectedElement.rotation || 0) + 90)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-xl"><RotateCw size={16}/></button>
                                 </div>
                             </div>
                         </div>
                     </div>
                 </div>
             </div>
         )}

         {/* MAP CONTROLS (ZOOM + FULLSCREEN) */}
         <div onMouseDown={(e) => e.stopPropagation()} className="absolute bottom-4 right-4 z-20 flex gap-2 bg-white/90 p-1.5 rounded-xl shadow-lg border no-print">
            {history.length > 0 && (
                <button onClick={undo} className="p-2 hover:bg-slate-100 rounded-lg text-indigo-600" title="Annuler (Ctrl+Z)"><Undo2 size={16} /></button>
            )}
            <div className="w-px bg-slate-200 mx-1"></div>
            <button onClick={() => setTransform(t => ({...t, scale: Math.max(t.scale - 0.2, 0.2)}))} className="p-2 hover:bg-slate-100 rounded-lg"><ZoomOut size={16} /></button>
            <span className="py-2 px-2 text-xs font-black min-w-[3rem] text-center">{Math.round(transform.scale * 100)}%</span>
            <button onClick={() => setTransform(t => ({...t, scale: Math.min(t.scale + 0.2, 4)}))} className="p-2 hover:bg-slate-100 rounded-lg"><ZoomIn size={16} /></button>
            <button onClick={() => setIsFullScreen(!isFullScreen)} className="p-2 hover:bg-slate-100 rounded-lg ml-2" title="Plein Écran">
                {isFullScreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <button onClick={() => setShowPrintPreview(true)} className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg ml-2"><Printer size={16} /></button>
         </div>

         {/* MAIN CANVAS */}
         <div 
            className={`flex-1 overflow-hidden relative bg-slate-100/50 w-full h-full print:bg-white ${isPanning ? 'cursor-grabbing' : 'cursor-grab'}`} 
            onWheel={handleWheel} 
            onClick={handleCanvasClick}
            onMouseDown={(e) => { 
                if((e.button === 1 || isSpacePressed || (e.button === 0 && !draggedStandId && !draggedPavilion && !draggedUtilitySpaceId)) ) { 
                    e.preventDefault();
                    setIsPanning(true); 
                    setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
                    hasMovedRef.current = false;
                } 
            }}
            onMouseMove={(e) => {
                if (isPanning) { 
                    setTransform(t => ({ ...t, x: e.clientX - panStart.x, y: e.clientY - panStart.y }));
                    hasMovedRef.current = true;
                } 
                else if (draggedPavilion && planContainerRef.current) {
                    const canvasRect = planContainerRef.current.getBoundingClientRect();
                    const newX = (e.clientX - canvasRect.left) / transform.scale - draggedPavilion.offsetX;
                    const newY = (e.clientY - canvasRect.top) / transform.scale - draggedPavilion.offsetY;
                    updateEntity(ev => ({ ...ev, pavilions: (ev.pavilions || []).map(p => p.id === draggedPavilion.id ? { ...p, x: newX, y: newY } : p) }));
                }
            }}
            onMouseUp={() => { setIsPanning(false); setDraggedPavilion(null); }} 
            onMouseLeave={() => { setIsPanning(false); setDraggedPavilion(null); }} 
            ref={planContainerRef}
         >
             <div className="absolute origin-top-left print:relative print:transform-none" style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, width: 'fit-content', height: 'fit-content' }}>
                 {(event.pavilions || [DEFAULT_HALL]).map((pav) => {
                     const styleWidth = pav.width * PIXELS_PER_METER;
                     const styleHeight = pav.depth * PIXELS_PER_METER;
                     const majorSize = PIXELS_PER_METER * 5; 
                     const minorSize = PIXELS_PER_METER; 
                     const isOutdoor = pav.type === 'Outdoor';
                     
                     return(
                     <div key={pav.id} className="absolute group print:relative print:border print:border-black print:mb-8" style={{ width: `${styleWidth}px`, height: `${styleHeight}px`, left: pav.x || 0, top: pav.y || 0 }} >
                         <div onMouseDown={(e) => { e.stopPropagation(); if(planContainerRef.current) setDraggedPavilion({ id: pav.id, offsetX: (e.clientX - planContainerRef.current.getBoundingClientRect().left) / transform.scale - (pav.x || 0), offsetY: (e.clientY - planContainerRef.current.getBoundingClientRect().top) / transform.scale - (pav.y || 0) }); }} className="absolute -top-10 left-0 text-2xl font-black text-slate-300 uppercase select-none cursor-move p-2 no-print whitespace-nowrap">{pav.name}</div>
                         <div 
                           className={`w-full h-full shadow-2xl border-2 transition-all relative print:shadow-none print:border-0 ${activePavilionId === pav.id ? 'border-indigo-500' : 'border-slate-300'} ${isOutdoor ? 'bg-emerald-50/50 border-dashed border-emerald-400' : 'bg-white dark:bg-slate-900'}`} 
                           onDragOver={(e) => e.preventDefault()} 
                           onDrop={(e) => handlePlanDrop(e, pav.id)}
                           style={{
                              backgroundImage: isOutdoor ? undefined : `
                                linear-gradient(rgba(0,0,0,0.2) 2px, transparent 2px), 
                                linear-gradient(90deg, rgba(0,0,0,0.2) 2px, transparent 2px), 
                                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), 
                                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
                              `,
                              backgroundSize: isOutdoor ? undefined : `${majorSize}px ${majorSize}px, ${majorSize}px ${majorSize}px, ${minorSize}px ${minorSize}px, ${minorSize}px ${minorSize}px`
                           }}
                         >
                             {isOutdoor && <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-5 text-emerald-600 font-black text-6xl uppercase -rotate-12">Espace Externe</div>}
                             {/* STANDS */}
                             {event.stands.filter(s => s.pavilionId === pav.id && s.x !== undefined).map((s) => {
                               const isSelected = selectedStandId === s.id;
                               const isMultiSelected = multiSelection.has(s.id);
                               const wP = ((s.width || 3) / pav.width) * 100;
                               const hP = ((s.depth || 3) / pav.depth) * 100;
                               const clipPath = getLStandClipPath(s);
                               const isChapiteau = s.type === 'chapiteau';
                               
                               // Flip Logic
                               const flipX = (s as any).flipX ? -1 : 1;
                               const flipY = (s as any).flipY ? -1 : 1;

                               return (
                                 <div 
                                    key={s.id} 
                                    draggable 
                                    onClick={(e) => handleElementClick(e, s.id, 'stand')} 
                                    onDragStart={(e) => { setDraggedStandId(s.id); e.dataTransfer.effectAllowed = "move"; setSelectedStandId(s.id); }} 
                                    style={{ 
                                        top: `${s.y}%`, 
                                        left: `${s.x}%`, 
                                        width: `${wP}%`, 
                                        height: `${hP}%`, 
                                        transform: `rotate(${s.rotation || 0}deg) scaleX(${flipX}) scaleY(${flipY})`, 
                                        backgroundColor: s.color,
                                        zIndex: isSelected ? 50 : 10,
                                        clipPath: clipPath,
                                        boxShadow: clipPath ? 'none' : isMultiSelected ? '0 0 0 4px #6366f1' : 'inset 0 0 0 1px rgba(0,0,0,0.1)',
                                        backgroundImage: isChapiteau ? 'linear-gradient(45deg, transparent 48%, rgba(0,0,0,0.2) 49%, rgba(0,0,0,0.2) 51%, transparent 52%), linear-gradient(-45deg, transparent 48%, rgba(0,0,0,0.2) 49%, rgba(0,0,0,0.2) 51%, transparent 52%)' : 'none'
                                    }} 
                                    className={`absolute cursor-pointer flex items-center justify-center text-center transition-transform print:border-2 print:border-black border-2 ${!clipPath ? '' : ''} ${getStandColorClass(!!s.participantId, s.area)}`}
                                 >
                                     {/* Counter-Transform for Text readability */}
                                     <div style={{ transform: `scaleX(${flipX}) scaleY(${flipY}) rotate(-${s.rotation || 0}deg)` }} className="relative z-10 flex flex-col items-center justify-center">
                                         <span className="text-xs md:text-sm font-black leading-tight select-none pointer-events-none bg-white/70 px-1.5 py-0.5 rounded shadow-sm backdrop-blur-sm print:text-black print:bg-white/70 print:shadow-none whitespace-nowrap">
                                            {s.number}
                                         </span>
                                         <span className="text-[10px] font-bold opacity-80 bg-white/50 px-1 rounded mt-0.5 whitespace-nowrap backdrop-blur-sm">
                                            {Number(s.area).toFixed(2)}m²
                                         </span>
                                         {s.participantId && <UserCheck size={12} className="text-emerald-600 mt-0.5 bg-white rounded-full p-0.5" />}
                                     </div>
                                     
                                     {s.customLogoUrl && <img src={s.customLogoUrl} style={{ transform: `scaleX(${flipX}) scaleY(${flipY}) rotate(-${s.rotation || 0}deg)` }} className="absolute inset-0 w-full h-full object-contain opacity-30 pointer-events-none" />}
                                 </div>
                               );
                             })}

                             {/* UTILITY SPACES */}
                             {(event.utilitySpaces || []).filter(u => u.pavilionId === pav.id && u.x !== undefined).map((u) => {
                               const isSelected = selectedUtilitySpaceId === u.id;
                               const isMultiSelected = multiSelection.has(u.id);
                               const wP = (u.width / pav.width) * 100;
                               const hP = (u.depth / pav.depth) * 100;
                               // Flip Logic
                               const flipX = (u as any).flipX ? -1 : 1;
                               const flipY = (u as any).flipY ? -1 : 1;

                               return (
                                 <div 
                                    key={u.id} 
                                    draggable
                                    onClick={(e) => handleElementClick(e, u.id, 'utility')}
                                    onDragStart={(e) => { setDraggedUtilitySpaceId(u.id); e.dataTransfer.effectAllowed = "move"; setSelectedUtilitySpaceId(u.id); }}
                                    style={{ 
                                        top: `${u.y}%`, 
                                        left: `${u.x}%`, 
                                        width: `${wP}%`, 
                                        height: `${hP}%`, 
                                        transform: `rotate(${u.rotation || 0}deg) scaleX(${flipX}) scaleY(${flipY})`, 
                                        zIndex: isSelected ? 50 : 20,
                                        backgroundColor: u.color 
                                    }} 
                                    className={`absolute cursor-pointer flex items-center justify-center bg-white/90 border-2 transition-all print:border-black ${isMultiSelected ? 'border-indigo-600 shadow-[0_0_0_4px_rgba(99,102,241,0.3)]' : 'border-slate-400 shadow-md'}`}
                                 >
                                     <div style={{ transform: `scaleX(${flipX}) scaleY(${flipY}) rotate(-${u.rotation || 0}deg)`, width: '100%', height: '100%', padding: '2px' }} className="flex items-center justify-center">
                                        {getUtilityIcon(u.type, "text-slate-700 w-full h-full p-0.5")}
                                     </div>
                                 </div>
                               );
                             })}
                         </div>
                     </div>
                     );
                 })}
             </div>
         </div>

         {/* PRINT PREVIEW MODAL */}
         {showPrintPreview && <PrintPreviewModal />}
      </div>

      {/* PAVILION MODAL */}
      {showPavilionModal && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-[32px] p-8 w-full max-w-md shadow-2xl border border-slate-200 dark:border-slate-800 animate-in zoom-in-95">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white">Ajouter un Espace</h3>
                    <button onClick={() => setShowPavilionModal(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"><X size={16}/></button>
                </div>
                
                <form onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const newPav: Pavilion = {
                        id: `PAV-${Date.now()}`,
                        name: formData.get('name') as string,
                        type: formData.get('type') as any,
                        width: parseFloat(formData.get('width') as string) || 20,
                        depth: parseFloat(formData.get('depth') as string) || 10,
                        x: 0, 
                        y: 0
                    };
                    updateEntity(ev => ({
                        ...ev,
                        pavilions: [...(ev.pavilions || []), newPav]
                    }));
                    setActivePavilionId(newPav.id);
                    setShowPavilionModal(false);
                }} className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Nom de l'espace</label>
                        <input name="name" required placeholder="Ex: Hall B, Chapiteau 1..." className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-black text-sm outline-none" />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Type de Structure</label>
                        <select name="type" className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-black text-xs outline-none">
                            <option value="Hall">Hall en Dur (Intérieur)</option>
                            <option value="Marquee">Chapiteau (Temporaire)</option>
                            <option value="Outdoor">Espace Extérieur (Nu)</option>
                        </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Largeur (m)</label>
                            <input name="width" type="number" required defaultValue={20} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-black text-sm outline-none" />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Profondeur (m)</label>
                            <input name="depth" type="number" required defaultValue={10} className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-indigo-600 rounded-2xl font-black text-sm outline-none" />
                        </div>
                    </div>
                    <button type="submit" className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all mt-4">
                        Créer Espace
                    </button>
                </form>
            </div>
        </div>
      )}
    </div>
  );
};

export default VisualPlanEditor;
