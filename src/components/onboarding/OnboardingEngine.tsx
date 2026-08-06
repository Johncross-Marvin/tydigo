/**
 * Tydigo Onboarding Engine
 *
 * Modular, step-driven onboarding system. Renders any journey
 * from the database with progress tracking, resume, and rewards.
 *
 * Supports: info, quiz, action, accept, tutorial, complete, preferences
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, CheckCircle2, Clock, PartyPopper,
  X, Award, Sparkles, Play, Pause, Volume2, VolumeX,
  Bell, Mail, MessageSquare, Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/components/auth-provider";
import {
  getOnboardingState, completeStep, skipStep, grantOnboardingReward,
  type OnboardingState, type OnboardingStep,
} from "@/services/onboarding";
import { getRoleDashboardPath } from "@/services/role";
import type { UserRole } from "@/lib/api";

type Props = {
  role: UserRole;
  onComplete?: () => void;
};

// ─── Step Content Renderers ───────────────────────────────

function InfoStep({ step }: { step: OnboardingStep }) {
  return (
    <div className="space-y-4 text-center" role="region" aria-label={step.title}>
      <div className="w-20 h-20 rounded-3xl bg-green-100 flex items-center justify-center mx-auto">
        <Sparkles className="w-10 h-10 text-[#145C25]" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-extrabold text-neutral-900">{step.title}</h2>
      {step.subtitle && <p className="text-lg font-semibold text-[#145C25]">{step.subtitle}</p>}
      <p className="text-neutral-600 leading-relaxed max-w-md mx-auto">{step.description}</p>
    </div>
  );
}

function QuizStep({ step, onAnswer }: { step: OnboardingStep; onAnswer: () => void }) {
  const [selected, setSelected] = useState<number | null>(null);

  const questions = [
    { q: "Which bin is for plastic waste?", options: ["Blue", "Green", "Black", "Red"], correct: 0 },
    { q: "Organic waste can become?", options: ["Plastic", "Compost", "Metal", "Glass"], correct: 1 },
    { q: "E-waste includes?", options: ["Food scraps", "Leaves", "Old phones", "Paper"], correct: 2 },
  ];

  const [qIdx, setQIdx] = useState(0);
  const q = questions[qIdx];

  return (
    <div className="space-y-6 text-center" role="region" aria-label={step.title}>
      <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto">
        <Award className="w-10 h-10 text-amber-600" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-extrabold text-neutral-900">{step.title}</h2>
      <p className="text-neutral-600">{step.description}</p>

      <div className="bg-neutral-50 rounded-2xl p-6">
        <p className="font-bold text-neutral-900 mb-4">{q.q}</p>
        <div className="grid gap-2" role="radiogroup" aria-label="Quiz options">
          {q.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => setSelected(i)}
              role="radio"
              aria-checked={selected === i}
              className={`p-4 rounded-xl border-2 text-left font-semibold transition-all ${
                selected === i
                  ? selected === q.correct
                    ? "border-green-500 bg-green-50 text-green-700"
                    : "border-red-500 bg-red-50 text-red-700"
                  : "border-neutral-200 hover:border-neutral-300"
              }`}
            >
              {opt}
              {selected === i && selected === q.correct && (
                <CheckCircle2 className="w-5 h-5 text-green-500 inline ml-2" aria-hidden="true" />
              )}
            </button>
          ))}
        </div>
      </div>

      {selected !== null && (
        <Button
          onClick={() => {
            if (qIdx < questions.length - 1) {
              setQIdx(qIdx + 1);
              setSelected(null);
            } else {
              onAnswer();
            }
          }}
          className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold"
          aria-label={qIdx < questions.length - 1 ? "Next question" : "Complete quiz"}
        >
          {qIdx < questions.length - 1 ? "Next Question" : "Complete Quiz"}
          <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
}

function ActionStep({ step, onAction }: { step: OnboardingStep; onAction: () => void }) {
  return (
    <div className="space-y-6 text-center" role="region" aria-label={step.title}>
      <div className="w-20 h-20 rounded-3xl bg-blue-100 flex items-center justify-center mx-auto">
        <CheckCircle2 className="w-10 h-10 text-blue-600" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-extrabold text-neutral-900">{step.title}</h2>
      {step.subtitle && <p className="text-lg font-semibold text-[#145C25]">{step.subtitle}</p>}
      <p className="text-neutral-600 leading-relaxed max-w-md mx-auto">{step.description}</p>
      <Button
        onClick={onAction}
        className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold px-8"
        aria-label={step.action_value || "Complete"}
      >
        {step.action_value || "Complete"}
        <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
      </Button>
    </div>
  );
}

function TutorialStep({ step, onComplete }: { step: OnboardingStep; onComplete: () => void }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasVideo = !!step.video_url;
  const hasIllustration = !!step.illustration;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-6 text-center" role="region" aria-label={step.title}>
      <div className="w-20 h-20 rounded-3xl bg-purple-100 flex items-center justify-center mx-auto">
        <Play className="w-10 h-10 text-purple-600" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-extrabold text-neutral-900">{step.title}</h2>
      {step.subtitle && <p className="text-lg font-semibold text-[#145C25]">{step.subtitle}</p>}
      <p className="text-neutral-600 leading-relaxed max-w-md mx-auto">{step.description}</p>

      {/* Video or Illustration */}
      <div className="relative rounded-2xl overflow-hidden bg-neutral-900 aspect-video max-w-md mx-auto">
        {hasVideo ? (
          <>
            <video
              ref={videoRef}
              src={step.video_url!}
              muted={isMuted}
              playsInline
              preload="metadata"
              className="w-full h-full object-cover"
              aria-label="Tutorial video"
              onEnded={() => setIsPlaying(false)}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <button
                onClick={togglePlay}
                className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors"
                aria-label={isPlaying ? "Pause video" : "Play video"}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 text-neutral-900" />
                ) : (
                  <Play className="w-7 h-7 text-neutral-900 ml-1" />
                )}
              </button>
            </div>
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
              aria-label={isMuted ? "Unmute video" : "Mute video"}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5 text-white" />
              ) : (
                <Volume2 className="w-5 h-5 text-white" />
              )}
            </button>
          </>
        ) : hasIllustration ? (
          <img
            src={step.illustration!}
            alt={step.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-neutral-400 text-sm">
            Tutorial content
          </div>
        )}
      </div>

      <Button
        onClick={onComplete}
        className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold px-8"
      >
        I Understand
        <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
      </Button>
    </div>
  );
}

function PreferencesStep({ step, onComplete }: { step: OnboardingStep; onComplete: () => void }) {
  const [prefs, setPrefs] = useState({
    push: true,
    email: true,
    sms: false,
  });

  const channels = [
    { key: "push", label: "Push Notifications", icon: Bell, desc: "Instant alerts in the app" },
    { key: "email", label: "Email", icon: Mail, desc: "Weekly summaries and updates" },
    { key: "sms", label: "SMS", icon: MessageSquare, desc: "Pickup reminders via text" },
  ];

  return (
    <div className="space-y-6 text-center" role="region" aria-label={step.title}>
      <div className="w-20 h-20 rounded-3xl bg-sky-100 flex items-center justify-center mx-auto">
        <Bell className="w-10 h-10 text-sky-600" aria-hidden="true" />
      </div>
      <h2 className="text-2xl font-extrabold text-neutral-900">{step.title}</h2>
      <p className="text-neutral-600 leading-relaxed max-w-md mx-auto">{step.description}</p>

      <div className="space-y-3 max-w-sm mx-auto">
        {channels.map((ch) => {
          const Icon = ch.icon;
          const isOn = prefs[ch.key as keyof typeof prefs];
          return (
            <button
              key={ch.key}
              onClick={() => setPrefs((p) => ({ ...p, [ch.key]: !isOn }))}
              className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                isOn
                  ? "border-[#145C25] bg-green-50"
                  : "border-neutral-200 bg-white hover:border-neutral-300"
              }`}
              role="switch"
              aria-checked={isOn}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isOn ? "bg-[#145C25]" : "bg-neutral-100"
              }`}>
                <Icon className={`w-5 h-5 ${isOn ? "text-white" : "text-neutral-500"}`} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-neutral-900 text-sm">{ch.label}</p>
                <p className="text-xs text-neutral-500">{ch.desc}</p>
              </div>
              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                isOn ? "border-[#145C25] bg-[#145C25]" : "border-neutral-300"
              }`}>
                {isOn && <CheckCircle2 className="w-4 h-4 text-white" />}
              </div>
            </button>
          );
        })}
      </div>

      <Button
        onClick={onComplete}
        className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold px-8"
      >
        Save Preferences
        <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />
      </Button>
    </div>
  );
}

function CompleteStep({ step, onFinish }: { step: OnboardingStep; onFinish: () => void }) {
  return (
    <div className="space-y-6 text-center py-8" role="region" aria-label="Onboarding complete">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto">
          <PartyPopper className="w-12 h-12 text-[#145C25]" aria-hidden="true" />
        </div>
        <div className="absolute -top-2 -right-2">
          <Sparkles className="w-8 h-8 text-amber-500 animate-pulse" aria-hidden="true" />
        </div>
      </div>
      <h2 className="text-3xl font-extrabold text-neutral-900">{step.title}</h2>
      <p className="text-xl font-semibold text-[#145C25]">{step.subtitle}</p>
      <p className="text-neutral-600 leading-relaxed max-w-md mx-auto">{step.description}</p>
      <div className="bg-green-50 rounded-2xl p-4 inline-block">
        <p className="text-green-700 font-bold flex items-center gap-2">
          <Award className="w-5 h-5" aria-hidden="true" /> +500 EcoPoints Bonus Earned!
        </p>
      </div>
      <Button
        onClick={onFinish}
        className="bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold px-10 text-lg"
      >
        Go to Dashboard
        <ArrowRight className="w-5 h-5 ml-2" aria-hidden="true" />
      </Button>
    </div>
  );
}

// ─── Main Engine ──────────────────────────────────────────

export function OnboardingEngine({ role, onComplete }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [state, setState] = useState<OnboardingState | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentStepIdx, setCurrentStepIdx] = useState(0);
  const [completing, setCompleting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const loadState = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const s = await getOnboardingState(user.id, role);
    setState(s);

    // Find first incomplete step
    const firstIncomplete = s.progress.findIndex((p) => !p.completed);
    setCurrentStepIdx(firstIncomplete >= 0 ? firstIncomplete : s.steps.length - 1);

    setLoading(false);
  }, [user, role]);

  useEffect(() => { loadState(); }, [loadState]);

  // Focus content on step change for accessibility
  useEffect(() => {
    contentRef.current?.focus();
  }, [currentStepIdx]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        if (!completing && currentStep && currentStep.action_type !== "complete") {
          handleNext();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStepIdx, completing]);

  const currentStep = state?.steps[currentStepIdx] ?? null;
  const currentProgress = state?.progress[currentStepIdx] ?? null;
  const isLastStep = currentStepIdx >= (state?.steps.length ?? 0) - 1;
  const isComplete = state?.isComplete ?? false;

  const handleCompleteStep = useCallback(async () => {
    if (!user || !state || !currentStep || !currentProgress) return;
    setCompleting(true);

    await completeStep(user.id, currentStep.id, 0);

    // Grant reward on specific steps
    if (currentStep.step_number === 1) {
      await grantOnboardingReward(user.id, 100, "Onboarding started");
    }
    if (isLastStep) {
      await grantOnboardingReward(user.id, 500, "Onboarding completed");
      setShowConfetti(true);
    }

    await loadState();
    setCompleting(false);
  }, [user, state, currentStep, currentProgress, isLastStep, loadState]);

  const handleSkip = useCallback(async () => {
    if (!user || !state || !currentStep) return;
    await skipStep(user.id, currentStep.id);
    await loadState();
  }, [user, state, currentStep, loadState]);

  const handleFinish = useCallback(() => {
    setShowConfetti(false);
    const dashboardPath = getRoleDashboardPath(role);
    navigate(dashboardPath, { replace: true });
    onComplete?.();
  }, [navigate, role, onComplete]);

  const handleNext = useCallback(() => {
    if (isLastStep) {
      handleCompleteStep();
    } else {
      handleCompleteStep().then(() => {
        setCurrentStepIdx((prev) => Math.min(prev + 1, (state?.steps.length ?? 1) - 1));
      });
    }
  }, [isLastStep, handleCompleteStep, state]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center" role="status" aria-label="Loading">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-green-100 border-t-[#145C25] animate-spin" />
          <p className="text-sm text-neutral-500">Loading your journey...</p>
        </div>
      </div>
    );
  }

  if (!state || !currentStep) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-neutral-500">No onboarding journey found.</p>
      </div>
    );
  }

  if (isComplete && !showConfetti) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <CompleteStep step={currentStep} onFinish={handleFinish} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 border-b border-neutral-100">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 -ml-1.5 rounded-lg hover:bg-neutral-100"
            aria-label="Close onboarding"
          >
            <X className="w-5 h-5 text-neutral-500" aria-hidden="true" />
          </button>
          <div className="flex items-center gap-2 text-sm text-neutral-500" aria-live="polite">
            <Clock className="w-4 h-4" aria-hidden="true" />
            ~{state.estimatedMinutes} min left
          </div>
          <div className="w-8" />
        </div>
        <Progress
          value={state.completionPct}
          className="h-2 rounded-full bg-neutral-100 [&>div]:bg-[#145C25] transition-all duration-500"
          aria-label={`Onboarding progress: ${state.completionPct}%`}
        />
        <p className="text-xs text-neutral-400 mt-1 text-right" aria-live="polite">
          {state.completedCount}/{state.totalSteps} steps • {state.completionPct}%
        </p>
      </header>

      {/* Content */}
      <main
        ref={contentRef}
        tabIndex={-1}
        className="flex-1 flex items-center justify-center p-6 outline-none"
        aria-label={`Step ${currentStepIdx + 1} of ${state.totalSteps}: ${currentStep.title}`}
      >
        <div className="w-full max-w-lg">
          {/* Step indicator */}
          <nav className="flex items-center gap-2 mb-8 justify-center" aria-label="Step progress">
            {state.steps.map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all motion-safe:transition-all ${
                  i < currentStepIdx
                    ? "w-8 bg-[#145C25]"
                    : i === currentStepIdx
                      ? "w-8 bg-[#145C25]"
                      : "w-4 bg-neutral-200"
                }`}
                aria-hidden="true"
              />
            ))}
          </nav>

          {/* Step content */}
          {currentStep.action_type === "info" && <InfoStep step={currentStep} />}
          {currentStep.action_type === "quiz" && (
            <QuizStep step={currentStep} onAnswer={handleCompleteStep} />
          )}
          {currentStep.action_type === "action" && (
            <ActionStep step={currentStep} onAction={handleCompleteStep} />
          )}
          {currentStep.action_type === "accept" && (
            <ActionStep step={currentStep} onAction={handleCompleteStep} />
          )}
          {currentStep.action_type === "tutorial" && (
            <TutorialStep step={currentStep} onComplete={handleCompleteStep} />
          )}
          {currentStep.action_type === "preferences" && (
            <PreferencesStep step={currentStep} onComplete={handleCompleteStep} />
          )}
          {currentStep.action_type === "complete" && showConfetti && (
            <CompleteStep step={currentStep} onFinish={handleFinish} />
          )}
        </div>
      </main>

      {/* Footer */}
      {currentStep.action_type !== "complete" && (
        <footer className="px-6 py-4 border-t border-neutral-100">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            {!currentStep.is_required && (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-neutral-500 rounded-xl"
                aria-label="Skip this step"
              >
                Skip
              </Button>
            )}
            <Button
              onClick={handleNext}
              disabled={completing}
              className="flex-1 bg-[#145C25] hover:bg-[#0F4A1E] text-white rounded-2xl font-bold h-12"
              aria-label={isLastStep ? "Complete onboarding" : "Continue to next step"}
            >
              {completing ? "Saving..." : isLastStep ? "Complete" : "Continue"}
              {!completing && <ArrowRight className="w-4 h-4 ml-2" aria-hidden="true" />}
            </Button>
          </div>
        </footer>
      )}

      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50" aria-hidden="true">
          {Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute motion-safe:animate-fall"
              style={{
                left: `${Math.random() * 100}%`,
                top: `-${Math.random() * 20}px`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            >
              <div
                className="w-3 h-3 rounded-sm"
                style={{
                  backgroundColor: ["#145C25", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6"][Math.floor(Math.random() * 5)],
                  transform: `rotate(${Math.random() * 360}deg)`,
                }}
              />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
          .motion-safe\\:animate-fall { animation: fall linear forwards; }
        }
      `}</style>
    </div>
  );
}
