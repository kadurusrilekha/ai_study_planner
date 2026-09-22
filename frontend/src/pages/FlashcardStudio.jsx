import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import API from "../api";
import AppLayout from "../components/AppLayout";
import { useToast } from "../components/Toast";
import ViewSourceModal from "../components/ViewSourceModal";
import PdfUploadModal from "../components/PdfUploadModal";
import {
  Layers,
  Sparkles,
  Plus,
  Search,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Trash2,
  Edit2,
  Save,
  X,
  Play,
  Brain,
  Check,
  BookOpen,
  FileText,
  UploadCloud
} from "lucide-react";

const FlashcardStudio = () => {
  const [flashcards, setFlashcards] = useState([]);
  const [dueStats, setDueStats] = useState({
    dueTodayCount: 0,
    difficultCount: 0,
    masteredCount: 0,
    dueCards: [],
    difficultCards: []
  });
  const [subjects, setSubjects] = useState([]);
  const [studyMaterials, setStudyMaterials] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAiModal, setShowAiModal] = useState(false);
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false);
  const [generatingAi, setGeneratingAi] = useState(false);

  // Source Mode ("PDF" vs "SUBJECT")
  const [sourceMode, setSourceMode] = useState("PDF");
  const [selectedMaterialId, setSelectedMaterialId] = useState("");

  // Source Grounding View Modal
  const [activeSourceRef, setActiveSourceRef] = useState(null);
  const [showViewSourceModal, setShowViewSourceModal] = useState(false);

  // Manual / Edit Card Form
  const [editingCard, setEditingCard] = useState(null);
  const [cardSubjectId, setCardSubjectId] = useState("");
  const [cardTopic, setCardTopic] = useState("");
  const [cardFront, setCardFront] = useState("");
  const [cardBack, setCardBack] = useState("");

  // AI Generator Inputs
  const [aiSubjectId, setAiSubjectId] = useState("");
  const [aiSubjectName, setAiSubjectName] = useState("");
  const [aiTopic, setAiTopic] = useState("");
  const [aiCardCount, setAiCardCount] = useState(5);
  const [aiGeneratedCards, setAiGeneratedCards] = useState(null);
  const [savingBatch, setSavingBatch] = useState(false);

  // 3D Flip Player Mode State
  const [activePlayDeck, setActivePlayDeck] = useState(null); // Array of cards
  const [currentDeckIndex, setCurrentDeckIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [cardsRes, dueRes, subjectsRes, materialsRes] = await Promise.all([
        API.get("/flashcards").catch(() => ({ data: [] })),
        API.get("/flashcards/due").catch(() => ({
          data: { dueTodayCount: 0, difficultCount: 0, masteredCount: 0, dueCards: [], difficultCards: [] }
        })),
        API.get("/subjects").catch(() => ({ data: [] })),
        API.get("/study-materials").catch(() => ({ data: { materials: [] } }))
      ]);

      const subList = subjectsRes.data || [];
      const matList = materialsRes.data?.materials || [];

      setFlashcards(cardsRes.data || []);
      setDueStats(dueRes.data || {});
      setSubjects(subList);
      setStudyMaterials(matList);

      if (matList.length > 0) {
        setSelectedMaterialId(matList[0]._id);
        if (matList[0].detectedTopics && matList[0].detectedTopics.length > 0) {
          setAiTopic(matList[0].detectedTopics[0].name);
        }
      } else if (subList.length > 0) {
        setSourceMode("SUBJECT");
        const firstSub = subList[0];
        setAiSubjectId(firstSub._id);
        setAiSubjectName(firstSub.name);
        if (firstSub.topics && firstSub.topics.length > 0) {
          setAiTopic(firstSub.topics[0].name);
        }
      }
    } catch (err) {
      console.error("Failed to load flashcard data", err);
      addToast("Failed to load flashcards", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleAiSubjectChange = (subjectId) => {
    setAiSubjectId(subjectId);
    const found = subjects.find((s) => s._id === subjectId);
    if (found) {
      setAiSubjectName(found.name);
      if (found.topics && found.topics.length > 0) {
        setAiTopic(found.topics[0].name);
      } else {
        setAiTopic("");
      }
    } else {
      setAiSubjectName("");
      setAiTopic("");
    }
  };

  const resetManualForm = () => {
    setEditingCard(null);
    setCardSubjectId("");
    setCardTopic("");
    setCardFront("");
    setCardBack("");
  };

  const handleOpenEditCard = (card) => {
    setEditingCard(card);
    setCardSubjectId(card.subject?._id || card.subject || "");
    setCardTopic(card.topic || "");
    setCardFront(card.front || "");
    setCardBack(card.back || "");
    setShowCreateModal(true);
  };

  const handleSaveManualCard = async (e) => {
    e.preventDefault();
    if (!cardFront.trim() || !cardBack.trim()) return;

    const payload = {
      subject: cardSubjectId || undefined,
      topic: cardTopic || "General",
      front: cardFront,
      back: cardBack,
      status: editingCard ? editingCard.status : "New"
    };

    try {
      if (editingCard) {
        const res = await API.put(`/flashcards/${editingCard._id}`, payload);
        setFlashcards(flashcards.map((c) => (c._id === editingCard._id ? res.data : c)));
        addToast("Flashcard updated! 🎴", "success");
      } else {
        const res = await API.post("/flashcards", payload);
        setFlashcards([res.data, ...flashcards]);
        addToast("Flashcard added! 🎴", "success");
      }
      setShowCreateModal(false);
      resetManualForm();
      fetchData();
    } catch (err) {
      addToast("Failed to save card", "error");
    }
  };

  const handleGenerateAiCards = async (e) => {
    e.preventDefault();
    if (!aiTopic.trim()) {
      addToast("Please select or enter a topic", "error");
      return;
    }

    if (sourceMode === "PDF" && !selectedMaterialId) {
      addToast("Please select an uploaded PDF study material or switch source mode.", "error");
      return;
    }

    setGeneratingAi(true);

    try {
      const payload = {
        topic: aiTopic,
        cardCount: Number(aiCardCount) || 5
      };

      if (sourceMode === "PDF" && selectedMaterialId) {
        payload.studyMaterialId = selectedMaterialId;
      } else {
        payload.subjectId = aiSubjectId || undefined;
        payload.subjectName = aiSubjectName;
      }

      const res = await API.post("/flashcards/generate", payload);

      if (res.data && res.data.success && Array.isArray(res.data.cards) && res.data.cards.length > 0) {
        setAiGeneratedCards(res.data.cards);
        if (res.data.insufficientContent && res.data.message) {
          addToast(res.data.message, "info");
        } else {
          addToast("AI Flashcards generated! Review & edit below.", "success");
        }
      } else {
        addToast(res.data?.message || "Not enough unique content available for this topic.", "error");
      }
    } catch (err) {
      addToast("Failed to generate flashcards", "error");
    } finally {
      setGeneratingAi(false);
    }
  };

  const handleSaveAiBatch = async () => {
    if (!aiGeneratedCards || aiGeneratedCards.length === 0) return;
    setSavingBatch(true);

    try {
      const res = await API.post("/flashcards/batch", { cards: aiGeneratedCards });
      if (res.data && res.data.success) {
        addToast(`Saved ${res.data.count} AI flashcards to your deck! 🎉`, "success");
        setShowAiModal(false);
        setAiGeneratedCards(null);
        fetchData();
      }
    } catch (err) {
      addToast("Failed to save cards batch", "error");
    } finally {
      setSavingBatch(false);
    }
  };

  const handleSrsReview = async (rating) => {
    if (!activePlayDeck || activePlayDeck.length === 0) return;
    const currentCard = activePlayDeck[currentDeckIndex];

    try {
      const res = await API.post(`/flashcards/${currentCard._id}/review`, { rating });
      const updatedCard = res.data?.card || currentCard;
      addToast(`Rated: ${rating}`, "info");

      // Update flashcards list and activePlayDeck in local state with updated document
      setFlashcards((prevCards) =>
        prevCards.map((c) => (c._id === updatedCard._id ? { ...c, ...updatedCard } : c))
      );

      const updatedDeck = [...activePlayDeck];
      updatedDeck[currentDeckIndex] = { ...currentCard, ...updatedCard };
      setActivePlayDeck(updatedDeck);

      setIsFlipped(false);
      if (currentDeckIndex < activePlayDeck.length - 1) {
        setCurrentDeckIndex(currentDeckIndex + 1);
      } else {
        addToast("Deck review completed! 🎉", "success");
        setActivePlayDeck(null);
        fetchData();
      }
    } catch (err) {
      addToast("Failed to record rating", "error");
    }
  };

  const handleDeleteCard = async (id) => {
    try {
      await API.delete(`/flashcards/${id}`);
      setFlashcards(flashcards.filter((c) => c._id !== id));
      addToast("Card deleted", "info");
      fetchData();
    } catch (err) {
      addToast("Failed to delete card", "error");
    }
  };

  const filteredCards = (flashcards || []).filter((card) => {
    if (!card) return false;
    const front = String(card.front || "").toLowerCase();
    const back = String(card.back || "").toLowerCase();
    const topic = String(card.topic || "").toLowerCase();
    const query = (searchQuery || "").toLowerCase();

    const matchesSearch = front.includes(query) || back.includes(query) || topic.includes(query);

    const matchesSubject =
      selectedSubjectFilter === "All"
        ? true
        : card.subject === selectedSubjectFilter || card.subject?._id === selectedSubjectFilter;

    return matchesSearch && matchesSubject;
  });

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
          <Sparkles className="w-10 h-10 text-[#E4ACB2] animate-spin" />
          <p className="font-heading font-bold text-sm text-[#2F3542]">Loading Flashcard Studio...</p>
        </div>
      </AppLayout>
    );
  }

  // -------------------------------------------------------------
  // 3D FLASHCARD FLIP PLAYER RENDER
  // -------------------------------------------------------------
  if (activePlayDeck && activePlayDeck.length > 0) {
    const currentCard = activePlayDeck[currentDeckIndex];

    return (
      <div className="min-h-screen bg-[#FAF8F3] text-[#2F3542] flex flex-col p-4 md:p-8 select-none">
        {/* Header */}
        <div className="max-w-3xl w-full mx-auto flex items-center justify-between py-4 border-b border-[#E8E5DE]">
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#F7E8EA] text-[#2F3542] border border-[#E4ACB2]/40">
              Card {currentDeckIndex + 1} of {activePlayDeck.length}
            </span>
            <span className="text-xs text-[#4B5563] font-semibold truncate">
              {currentCard?.subject?.name || "Flashcard Studio"}
            </span>
          </div>

          <button
            onClick={() => setActivePlayDeck(null)}
            className="p-2 text-[#667085] hover:text-[#2F3542] rounded-xl hover:bg-[#E8E5DE]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3D Card Area */}
        <div className="max-w-2xl w-full mx-auto flex-1 flex flex-col items-center justify-center my-8">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full h-80 sm:h-96 perspective-1000 cursor-pointer group select-none"
          >
            <div
              className={`relative w-full h-full duration-500 transform-style-3d transition-transform ${
                isFlipped ? "rotate-y-180" : ""
              }`}
            >
              {/* FRONT SIDE (Question / Prompt) */}
              <div className="absolute inset-0 w-full h-full bg-white border border-[#E8E5DE] rounded-3xl p-8 shadow-lg flex flex-col justify-between backface-hidden">
                <div className="flex justify-between items-center text-xs text-[#4B5563] font-semibold">
                  <span className="uppercase tracking-widest text-[#4B5563]">Front — Question</span>
                  <span>Click to flip 🔄</span>
                </div>

                <div className="my-auto text-center space-y-2">
                  <h3 className="font-heading font-extrabold text-xl md:text-2xl text-[#2F3542] leading-relaxed">
                    {currentCard?.front}
                  </h3>
                  <span className="text-xs text-[#4B5563] block">Topic: {currentCard?.topic || "General"}</span>
                </div>

                <div className="text-center text-xs text-[#667085] italic">
                  Tap anywhere on the card to reveal answer
                </div>
              </div>

              {/* BACK SIDE (Answer / Explanation) */}
              <div className="absolute inset-0 w-full h-full bg-[#F7E8EA] border border-[#E4ACB2]/40 rounded-3xl p-8 shadow-lg flex flex-col justify-between backface-hidden rotate-y-180">
                <div className="flex justify-between items-center text-xs text-[#2F3542] font-semibold">
                  <span className="uppercase tracking-widest text-[#4B5563]">Back — Answer</span>
                  {currentCard?.sourceRef ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSourceRef(currentCard.sourceRef);
                        setShowViewSourceModal(true);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-white hover:bg-[#FAF8F3] text-[#2F3542] text-xs font-bold transition-all flex items-center gap-1 border border-[#E4ACB2]/40"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-[#2F3542]" />
                      <span>📖 View Source</span>
                    </button>
                  ) : (
                    <span>Revealed ✓</span>
                  )}
                </div>

                <div className="my-auto text-center space-y-2">
                  <p className="font-heading font-semibold text-lg md:text-xl text-[#2F3542] leading-relaxed">
                    {currentCard?.back}
                  </p>
                </div>

                <div className="text-center text-xs text-[#4B5563]">
                  Rate your memory recall below:
                </div>
              </div>
            </div>
          </div>

          {/* SRS Rating Bar (Visible after revealing back side) */}
          {isFlipped ? (
            <div className="grid grid-cols-4 gap-3 w-full mt-8 animate-in fade-in">
              <button
                onClick={() => handleSrsReview("Again")}
                className="py-3 rounded-2xl bg-[#D99A9A]/30 border border-[#D99A9A] text-[#2F3542] font-bold text-xs hover:bg-[#D99A9A] hover:text-white transition-all text-center"
              >
                <span>Again</span>
                <span className="block text-[10px] opacity-75 font-normal">1 min</span>
              </button>

              <button
                onClick={() => handleSrsReview("Hard")}
                className="py-3 rounded-2xl bg-[#E7D59A]/30 border border-[#E7D59A] text-[#2F3542] font-bold text-xs hover:bg-[#E7D59A] transition-all text-center"
              >
                <span>Hard</span>
                <span className="block text-[10px] opacity-75 font-normal">1 day</span>
              </button>

              <button
                onClick={() => handleSrsReview("Good")}
                className="py-3 rounded-2xl bg-[#CCD5AE]/40 border border-[#CCD5AE] text-[#2F3542] font-bold text-xs hover:bg-[#CCD5AE] transition-all text-center"
              >
                <span>Good</span>
                <span className="block text-[10px] opacity-75 font-normal">3 days</span>
              </button>

              <button
                onClick={() => handleSrsReview("Easy")}
                className="py-3 rounded-2xl bg-[#E4ACB2]/40 border border-[#E4ACB2] text-[#2F3542] font-bold text-xs hover:bg-[#E4ACB2] transition-all text-center"
              >
                <span>Easy</span>
                <span className="block text-[10px] opacity-75 font-normal">7 days</span>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsFlipped(true)}
              className="mt-8 px-8 py-3.5 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs shadow-sm transition-all"
            >
              Reveal Answer
            </button>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // MAIN FLASHCARD STUDIO HUB RENDER
  // -------------------------------------------------------------
  return (
    <AppLayout>
      <div className="space-y-8 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-2xl md:text-3xl text-[#2F3542]">
              Flashcard Studio & SRS Engine
            </h2>
            <p className="text-xs md:text-sm text-[#4B5563]">
              3D interactive flip cards powered by SuperMemo-2 Spaced Repetition
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs md:text-sm shadow-sm transition-all shrink-0"
            >
              <Brain className="w-4.5 h-4.5 text-[#2F3542]" />
              <span>Generate with AI</span>
            </button>

            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-white border border-[#E8E5DE] text-[#2F3542] font-semibold text-xs md:text-sm hover:bg-[#FAF8F3] transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Manual Card</span>
            </button>
          </div>
        </div>

        {/* Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#E4ACB2]">
              <Clock className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Due Today</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {dueStats.dueTodayCount} Cards
              </h3>
            </div>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F0F3E7] text-[#CCD5AE]">
              <CheckCircle2 className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Mastered</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {dueStats.masteredCount} Cards
              </h3>
            </div>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#D99A9A]">
              <AlertTriangle className="w-6 h-6 text-[#D99A9A]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Difficult Cards</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {dueStats.difficultCount} Cards
              </h3>
            </div>
          </div>

          <div className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-[#F0F3E7] text-[#2F3542]">
              <BookOpen className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#4B5563] uppercase tracking-wider">Active Decks</p>
              <h3 className="font-heading font-bold text-2xl text-[#2F3542]">
                {subjects.length}
              </h3>
            </div>
          </div>
        </div>

        {/* PDF Study Material Upload Banner */}
        <div className="p-6 rounded-3xl bg-[#FAF8F3] border border-[#E8E5DE] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-[#F7E8EA] text-[#2F3542]">
              <FileText className="w-6 h-6 text-[#2F3542]" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base md:text-lg text-[#2F3542]">
                Turn your PDF notes into flashcard decks ✨
              </h3>
              <p className="text-xs text-[#4B5563]">
                Upload PDF slides or textbooks for 100% source-grounded active recall cards with 📖 View Source references
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowPdfUploadModal(true)}
            className="px-5 py-2.5 rounded-2xl bg-[#CCD5AE] hover:bg-[#B9C89A] text-[#2F3542] font-bold text-xs shadow-sm shrink-0 flex items-center gap-1.5"
          >
            <UploadCloud className="w-4 h-4 text-[#2F3542]" />
            <span>Upload PDF Notes</span>
          </button>
        </div>

        {/* Quick Launch Active Review Banner */}
        {dueStats.dueTodayCount > 0 && (
          <div className="p-6 rounded-3xl bg-[#F7E8EA] text-[#2F3542] flex flex-col sm:flex-row items-center justify-between gap-4 border border-[#E4ACB2]/40">
            <div className="space-y-1 text-center sm:text-left">
              <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                You have {dueStats.dueTodayCount} flashcards due for review today!
              </h3>
              <p className="text-xs text-[#4B5563]">
                Reviewing cards on schedule optimizes long-term memory retention.
              </p>
            </div>
            <button
              onClick={() => {
                setActivePlayDeck(dueStats.dueCards);
                setCurrentDeckIndex(0);
                setIsFlipped(false);
              }}
              className="px-6 py-3 rounded-2xl bg-[#E4ACB2] hover:bg-[#D69AA2] text-[#2F3542] font-bold text-xs shadow-sm shrink-0"
            >
              Start Today's Review 🚀
            </button>
          </div>
        )}

        {/* Search & Subject Filter Bar */}
        <div className="card-base rounded-3xl p-4 md:p-6 bg-white border border-[#E8E5DE] flex flex-col sm:flex-row gap-4 justify-between">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#667085]" />
            <input
              type="text"
              placeholder="Search flashcards by question or answer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl pl-10 pr-3 py-2 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] focus:outline-none focus:border-[#E4ACB2]"
            />
          </div>

          <div className="sm:w-64">
            <select
              value={selectedSubjectFilter}
              onChange={(e) => setSelectedSubjectFilter(e.target.value)}
              className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-3.5 py-2 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
            >
              <option value="All">All Subjects</option>
              {subjects.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Flashcards Grid Display */}
        {filteredCards.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCards.map((card) => (
              <div
                key={card._id}
                className="card-base rounded-3xl p-6 bg-white border border-[#E8E5DE] space-y-4 flex flex-col justify-between hover:shadow-lg transition-all"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-[#F7E8EA] text-[#2F3542] border border-[#E4ACB2]/30">
                      {card.topic || "General"}
                    </span>
                    <span className="text-[10px] font-bold text-[#2F3542]">
                      {card.status || "Learning"}
                    </span>
                  </div>

                  <h4 className="font-heading font-bold text-[#2F3542] text-base leading-snug">
                    {card.front}
                  </h4>
                  <p className="text-xs text-[#4B5563] line-clamp-2">
                    {card.back}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-[#E8E5DE]">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setActivePlayDeck([card]);
                        setCurrentDeckIndex(0);
                        setIsFlipped(false);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F7E8EA] text-[#2F3542] hover:bg-[#E4ACB2] font-bold text-xs transition-all flex items-center gap-1 border border-[#E4ACB2]/40"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" /> Flip Card
                    </button>
                    {card.sourceRef && (
                      <button
                        onClick={() => {
                          setActiveSourceRef(card.sourceRef);
                          setShowViewSourceModal(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#FAF8F3] text-[#2F3542] font-bold text-xs transition-all flex items-center gap-1 border border-[#E8E5DE]"
                        title="View PDF Source Reference"
                      >
                        <BookOpen className="w-3.5 h-3.5 text-[#2F3542]" />
                        <span>Source</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditCard(card)}
                      className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-lg"
                      title="Edit Card"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCard(card._id)}
                      className="p-1.5 text-[#667085] hover:text-[#D99A9A] rounded-lg"
                      title="Delete Card"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-16 text-center space-y-4 bg-[#FAF8F3] rounded-3xl border border-dashed border-[#E8E5DE] p-8">
            <Layers className="w-12 h-12 text-[#E4ACB2] mx-auto" />
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-lg text-[#2F3542]">Your Study Deck is Empty</h3>
              <p className="text-xs text-[#4B5563] max-w-sm mx-auto font-medium">
                Upload your PDF study material to generate source-grounded active recall cards, or add manual cards to start practicing.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowPdfUploadModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-[#CCD5AE] hover:bg-[#B9C89A] text-[#2F3542] font-bold text-xs shadow-sm flex items-center gap-1.5"
              >
                <UploadCloud className="w-4 h-4 text-[#2F3542]" />
                <span>Upload Study Material</span>
              </button>
              <button
                onClick={() => {
                  resetManualForm();
                  setShowCreateModal(true);
                }}
                className="px-5 py-2.5 rounded-2xl bg-white border border-[#E8E5DE] text-[#2F3542] font-semibold text-xs hover:bg-[#FAF8F3] transition-colors"
              >
                + Manual Card
              </button>
            </div>
          </div>
        )}

        {/* Modal 1: Create / Edit Manual Card */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-md bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl space-y-5">
              <div className="flex items-center justify-between">
                <h3 className="font-heading font-bold text-lg text-[#2F3542]">
                  {editingCard ? "Edit Flashcard" : "Add New Flashcard"}
                </h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveManualCard} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Front Side (Question / Concept)
                  </label>
                  <textarea
                    placeholder="e.g. What is the time complexity of QuickSort?"
                    value={cardFront}
                    onChange={(e) => setCardFront(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] focus:outline-none focus:border-[#E4ACB2]"
                    rows="2"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                    Back Side (Answer / Explanation)
                  </label>
                  <textarea
                    placeholder="e.g. Average O(N log N), Worst O(N^2)"
                    value={cardBack}
                    onChange={(e) => setCardBack(e.target.value)}
                    className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] focus:outline-none focus:border-[#E4ACB2]"
                    rows="3"
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-xs font-medium text-[#4B5563] hover:text-[#2F3542]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 text-xs font-bold bg-[#CCD5AE] text-[#2F3542] rounded-xl hover:bg-[#B9C89A] shadow-sm transition-all"
                  >
                    {editingCard ? "Update Card" : "Save Card"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal 2: Generate Flashcards with AI */}
        {showAiModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-xl max-h-[90vh] bg-white border border-[#E8E5DE] rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col overflow-hidden space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E5DE]">
                <h3 className="font-heading font-bold text-lg text-[#2F3542] flex items-center gap-2">
                  <Brain className="w-5 h-5 text-[#E4ACB2]" />
                  Generate Flashcards with AI
                </h3>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="p-1.5 text-[#667085] hover:text-[#2F3542] rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Source Mode Selector Tabs */}
              <div className="grid grid-cols-2 gap-2 p-1.5 bg-[#FAF8F3] rounded-2xl border border-[#E8E5DE]">
                <button
                  type="button"
                  onClick={() => setSourceMode("PDF")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    sourceMode === "PDF"
                      ? "bg-white text-[#2F3542] shadow-sm border border-[#E8E5DE]"
                      : "text-[#4B5563] hover:text-[#2F3542]"
                  }`}
                >
                  📄 Uploaded PDF Document
                </button>
                <button
                  type="button"
                  onClick={() => setSourceMode("SUBJECT")}
                  className={`py-2 rounded-xl text-xs font-bold transition-all ${
                    sourceMode === "SUBJECT"
                      ? "bg-white text-[#2F3542] shadow-sm border border-[#E8E5DE]"
                      : "text-[#4B5563] hover:text-[#2F3542]"
                  }`}
                >
                  📚 Subject Core Syllabus
                </button>
              </div>

              {!aiGeneratedCards ? (
                <form onSubmit={handleGenerateAiCards} className="space-y-4 pt-1">
                  {sourceMode === "PDF" ? (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-xs font-semibold text-[#2F3542] block">
                          Select PDF Study Material
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowPdfUploadModal(true)}
                          className="text-[11px] font-bold text-[#E4ACB2] hover:underline"
                        >
                          + Upload New PDF
                        </button>
                      </div>

                      {studyMaterials.length > 0 ? (
                        <select
                          value={selectedMaterialId}
                          onChange={(e) => {
                            const matId = e.target.value;
                            setSelectedMaterialId(matId);
                            const mat = studyMaterials.find((m) => m._id === matId);
                            if (mat && mat.detectedTopics && mat.detectedTopics.length > 0) {
                              setAiTopic(mat.detectedTopics[0].name);
                            }
                          }}
                          className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                          required
                        >
                          {studyMaterials.map((m) => (
                            <option key={m._id} value={m._id}>
                              {m.fileName} ({m.pageCount} pages • {m.detectedTopics?.length || 0} topics)
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="p-4 rounded-xl bg-[#F7E8EA]/50 border border-[#E4ACB2]/40 text-center space-y-2">
                          <p className="text-xs text-[#2F3542] font-semibold">No uploaded PDF study materials found.</p>
                          <button
                            type="button"
                            onClick={() => setShowPdfUploadModal(true)}
                            className="px-4 py-1.5 rounded-xl bg-[#E4ACB2] text-[#2F3542] font-bold text-xs hover:bg-[#D69AA2]"
                          >
                            Upload PDF Document Now
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                        Subject
                      </label>
                      <select
                        value={aiSubjectId}
                        onChange={(e) => handleAiSubjectChange(e.target.value)}
                        className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                        required
                      >
                        <option value="">Select Subject</option>
                        {subjects.map((s) => (
                          <option key={s._id} value={s._id}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Select Topic
                    </label>
                    {(() => {
                      let topicsList = [];
                      if (sourceMode === "PDF" && selectedMaterialId) {
                        const selectedMat = studyMaterials.find((m) => m._id === selectedMaterialId);
                        if (selectedMat && selectedMat.detectedTopics) {
                          topicsList = selectedMat.detectedTopics.map((t) => t.name);
                        }
                      } else {
                        const currentSub = subjects.find((s) => s._id === aiSubjectId);
                        if (currentSub && Array.isArray(currentSub.topics)) {
                          topicsList = currentSub.topics.map((t) => t.name);
                        }
                      }

                      if (topicsList.length > 0) {
                        return (
                          <div className="space-y-2">
                            <select
                              value={aiTopic}
                              onChange={(e) => setAiTopic(e.target.value)}
                              className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                              required
                            >
                              <option value="All Topics">All Topics</option>
                              {topicsList.map((tName, idx) => (
                                <option key={idx} value={tName}>
                                  {tName}
                                </option>
                              ))}
                            </select>
                            <input
                              type="text"
                              placeholder="Or type a custom topic..."
                              value={aiTopic}
                              onChange={(e) => setAiTopic(e.target.value)}
                              className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2 text-xs text-[#2F3542] placeholder-[#667085] focus:outline-none focus:border-[#E4ACB2]"
                            />
                          </div>
                        );
                      }

                      return (
                        <input
                          type="text"
                          placeholder="e.g. Memory allocation, Pointers, Garbage Collection"
                          value={aiTopic}
                          onChange={(e) => setAiTopic(e.target.value)}
                          className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] placeholder-[#667085] focus:outline-none focus:border-[#E4ACB2]"
                          required
                        />
                      );
                    })()}
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#2F3542] block mb-1">
                      Number of Cards to Generate
                    </label>
                    <select
                      value={aiCardCount}
                      onChange={(e) => setAiCardCount(e.target.value)}
                      className="w-full bg-[#FAF8F3] border border-[#E8E5DE] rounded-xl px-4 py-2.5 text-xs md:text-sm text-[#2F3542] focus:outline-none focus:border-[#E4ACB2]"
                    >
                      <option value={5}>5 Flashcards</option>
                      <option value={10}>10 Flashcards</option>
                      <option value={15}>15 Flashcards</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAiModal(false)}
                      className="px-4 py-2 text-xs font-medium text-[#4B5563] hover:text-[#2F3542]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={generatingAi}
                      className="px-6 py-2.5 text-xs font-bold bg-[#CCD5AE] text-[#2F3542] rounded-xl hover:bg-[#B9C89A] shadow-sm transition-all"
                    >
                      {generatingAi ? "Generating Cards..." : "Generate AI Flashcards"}
                    </button>
                  </div>
                </form>
              ) : (
                /* Review -> Edit -> Delete -> Save Selected Cards Workflow */
                <div className="space-y-4 pt-3 flex-1 flex flex-col overflow-hidden">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-bold text-[#2F3542]">
                      Review Generated Flashcards ({aiGeneratedCards.length})
                    </span>
                    <button
                      onClick={handleSaveAiBatch}
                      disabled={savingBatch}
                      className="px-4 py-2 rounded-xl bg-[#CCD5AE] hover:bg-[#B9C89A] text-[#2F3542] font-bold text-xs flex items-center gap-1.5 shadow-sm"
                    >
                      <Save className="w-4 h-4 text-[#2F3542]" />
                      <span>{savingBatch ? "Saving..." : "Save All to Deck"}</span>
                    </button>
                  </div>

                  <div className="space-y-3 overflow-y-auto flex-1 pr-1">
                    {aiGeneratedCards.map((c, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-[#FAF8F3] border border-[#E8E5DE] space-y-2">
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">Front (Question)</label>
                          <input
                            type="text"
                            value={c.front}
                            onChange={(e) => {
                              const updated = [...aiGeneratedCards];
                              updated[idx].front = e.target.value;
                              setAiGeneratedCards(updated);
                            }}
                            className="w-full bg-white border border-[#E8E5DE] rounded-lg px-3 py-1.5 text-xs text-[#2F3542]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] font-bold uppercase tracking-wider text-[#4B5563]">Back (Answer)</label>
                          <textarea
                            value={c.back}
                            onChange={(e) => {
                              const updated = [...aiGeneratedCards];
                              updated[idx].back = e.target.value;
                              setAiGeneratedCards(updated);
                            }}
                            className="w-full bg-white border border-[#E8E5DE] rounded-lg px-3 py-1.5 text-xs text-[#2F3542]"
                            rows="2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* View Source Reference Modal */}
        <ViewSourceModal
          isOpen={showViewSourceModal}
          onClose={() => setShowViewSourceModal(false)}
          sourceRef={activeSourceRef}
        />

        {/* Upload PDF Study Material Modal */}
        <PdfUploadModal
          isOpen={showPdfUploadModal}
          onClose={() => setShowPdfUploadModal(false)}
          subjects={subjects}
          onUploadSuccess={(newMat) => {
            fetchData();
            if (newMat) {
              setSelectedMaterialId(newMat._id);
              setSourceMode("PDF");
              setShowAiModal(true);
            }
          }}
        />
      </div>
    </AppLayout>
  );
};

export default FlashcardStudio;
