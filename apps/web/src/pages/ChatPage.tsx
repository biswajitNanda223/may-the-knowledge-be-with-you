import { useState, type FormEvent } from "react";
import { EvidenceDrawer } from "../components/EvidenceDrawer";
import { Icon } from "../components/Icon";
import { useChatSession } from "../hooks/useChatSession";

const SUGGESTED_QUESTIONS = [
  "Which rules govern a project?",
  "Who owns project delivery?",
  "What systems support CAPEX?",
];

export function ChatPage() {
  const chat = useChatSession();
  const [evidenceOpen, setEvidenceOpen] = useState(false);

  return (
    <main className="chat-workspace">
      <section className="chat-surface">
        <ChatHeader
          sourceCount={chat.nodes.length}
          onOpenEvidence={() => setEvidenceOpen(true)}
        />
        <Conversation
          answer={chat.answer}
          submittedQuestion={chat.submittedQuestion}
          busy={chat.busy}
          onSelectQuestion={chat.setQuestion}
        />
        <ChatComposer
          question={chat.question}
          busy={chat.busy}
          onQuestionChange={chat.setQuestion}
          onSubmit={chat.submit}
        />
      </section>

      {evidenceOpen && (
        <EvidenceDrawer
          nodes={chat.nodes}
          edges={chat.edges}
          trace={chat.trace}
          highlightedNodeIds={chat.citedNodeIds}
          animatedPaths={chat.animatedPaths}
          onClose={() => setEvidenceOpen(false)}
        />
      )}
    </main>
  );
}

function ChatHeader({
  sourceCount,
  onOpenEvidence,
}: {
  sourceCount: number;
  onOpenEvidence: () => void;
}) {
  return (
    <div className="chat-heading">
      <div>
        <h1>Ask Knowledge Way</h1>
        <p className="muted">Answers grounded in your enterprise knowledge.</p>
      </div>
      <button
        type="button"
        className="secondary-button evidence-toggle"
        onClick={onOpenEvidence}
      >
        Sources <b>{sourceCount}</b>
      </button>
    </div>
  );
}

type ConversationProps = {
  answer: string;
  submittedQuestion: string;
  busy: boolean;
  onSelectQuestion: (question: string) => void;
};

function Conversation({
  answer,
  submittedQuestion,
  busy,
  onSelectQuestion,
}: ConversationProps) {
  if (!answer && !busy) {
    return <EmptyConversation onSelectQuestion={onSelectQuestion} />;
  }

  return (
    <div className="conversation has-answer" aria-live="polite">
      <div className="message-list">
        <div className="user-message">
          <small>You</small>
          <p>{submittedQuestion}</p>
        </div>
        <div className="assistant-message">
          <div className="assistant-avatar">
            <img src="/knowledge-way-logo.png" alt="" />
          </div>
          <div>
            <small>Knowledge Way</small>
            <p>
              {answer || "Reviewing connected sources…"}
              {busy && answer && <span className="cursor">▌</span>}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyConversation({
  onSelectQuestion,
}: {
  onSelectQuestion: (question: string) => void;
}) {
  return (
    <div className="conversation" aria-live="polite">
      <div className="chat-empty">
        <span className="empty-mark">
          <img src="/knowledge-way-logo.png" alt="" />
        </span>
        <h2>Ask a question about your organization</h2>
        <p>
          Search across policies, processes, ownership, systems, and
          relationships.
        </p>
        <div className="prompt-chips">
          {SUGGESTED_QUESTIONS.map((prompt) => (
            <button
              type="button"
              key={prompt}
              onClick={() => onSelectQuestion(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

type ChatComposerProps = {
  question: string;
  busy: boolean;
  onQuestionChange: (question: string) => void;
  onSubmit: (event: FormEvent) => Promise<void>;
};

function ChatComposer({
  question,
  busy,
  onQuestionChange,
  onSubmit,
}: ChatComposerProps) {
  return (
    <form className="chat-composer" onSubmit={onSubmit}>
      <textarea
        aria-label="Ask Knowledge Way"
        placeholder="Ask a question…"
        value={question}
        onChange={(event) => onQuestionChange(event.target.value)}
        rows={1}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button
        className="send-button"
        disabled={busy || !question.trim()}
        aria-label="Send question"
      >
        {busy ? (
          "…"
        ) : (
          <>
            <Icon name="send" size={14} /> Send
          </>
        )}
      </button>
      <small>Enter to send · Shift + Enter for a new line</small>
    </form>
  );
}
