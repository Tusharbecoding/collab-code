import { useEffect, useState, useRef } from "react";

import Editor, { OnMount } from "@monaco-editor/react";
import { Socket } from "socket.io-client";
import { UserCursor } from "@/types/collaboration";
import * as monaco from "monaco-editor";

interface CodeEditorProps {
  initialCode: string;
  language: string;
  onCodeChange: (code: string) => void;
  onCursorMove: (position: any) => void;
  cursors: UserCursor[];
  socket: Socket | null;
}

export default function CodeEditor({
  initialCode,
  language,
  onCodeChange,
  onCursorMove,
  cursors,
  socket,
}: CodeEditorProps) {
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [code, setCode] = useState(initialCode);
  const decorationsRef = useRef<string[]>([]);
  const lastChangeRef = useRef<string>("");

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    editor.onDidChangeCursorPosition((e) => {
      onCursorMove({
        lineNumber: e.position.lineNumber,
        column: e.position.column,
      });
    });
    editor.onDidChangeModelContent((e) => {
      const newCode = editor.getValue();
      if (newCode !== lastChangeRef.current) {
        setCode(newCode);
        onCodeChange(newCode);
      }
    });
  };

  useEffect(() => {
    if (!socket || !editorRef.current) return;

    const handleCodeChange = (change: any) => {
      const editor = editorRef.current;
      if (!editor) return;

      lastChangeRef.current = change.text;
      const position = editor.getPosition();

      editor.setValue(change.text);
      if (position) {
        editor.setPosition(position);
      }
    };

    socket.on("code-change", handleCodeChange);

    return () => {
      socket.off("code-change", handleCodeChange);
    };
  }, [socket]);

  useEffect(() => {
    if (!editorRef.current) return;

    const editor = editorRef.current;
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      []
    );

    const newDecorations = cursors.map((cursor) => ({
      range: new monaco.Range(
        cursor.position.line,
        cursor.position.column,
        cursor.position.line,
        cursor.position.column
      ),
      options: {
        className: "remote-cursor",
        afterContentClassName: "remote-cursor-label",
        after: {
          content: ` ${cursor.username}`,
          inlineClassName: "remote-cursor-name",
          inlineClassNameAffectsLetterSpacing: true,
        },
        beforeContentClassName: "remote-cursor-line",
        glyphMarginClassName: "remote-cursor-glyph",
        stickiness:
          monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
      },
    }));

    decorationsRef.current = editor.deltaDecorations([], newDecorations);
  }, [cursors]);

  useEffect(() => {
    const style = document.createElement("style");
    style.textContent = `
      .remote-cursor {
        border-left: 2px solid #FF6B6B;
        background-color: rgba(255, 107, 107, 0.1);
      }
      
      .remote-cursor-name {
        background-color: #FF6B6B;
        color: white;
        padding: 1px 4px;
        border-radius: 2px;
        font-size: 11px;
        line-height: 12px;
        margin-left: 2px;
      }
      
      .remote-cursor-line {
        border-left: 2px solid #FF6B6B;
        height: 18px;
        position: absolute;
        left: 0;
        top: 0;
      }
    `;
    document.head.appendChild(style);

    return () => {
      document.head.removeChild(style);
    };
  }, []);

  return (
    <div className="h-full">
      <Editor
        height="100%"
        language={language}
        value={code}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          fontSize: 14,
          minimap: { enabled: false },
          scrollBeyondLastLine: false,
          automaticLayout: true,
          wordWrap: "on",
          lineNumbers: "on",
          glyphMargin: true,
          folding: true,
          lineDecorationsWidth: 10,
          lineNumbersMinChars: 3,
          renderWhitespace: "selection",
          suggestOnTriggerCharacters: true,
          acceptSuggestionOnEnter: "on",
          tabCompletion: "on",

          parameterHints: {
            enabled: true,
            cycle: true,
          },
          quickSuggestions: {
            other: true,
            comments: true,
            strings: true,
          },
        }}
      />
    </div>
  );
}
