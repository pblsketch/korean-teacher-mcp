#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpExpressApp } from '@modelcontextprotocol/sdk/server/express.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { randomUUID } from 'node:crypto';
import { initDb } from './db/schema.js';
import { registerIngestTool } from './tools/ingest.js';
import { registerSearchTool } from './tools/search.js';
import { registerWorksheetTool } from './tools/generate-worksheet.js';
import { registerAssessmentTool } from './tools/generate-assessment.js';
import { registerPblTool } from './tools/generate-pbl.js';
import { registerDiscussionTool } from './tools/generate-discussion.js';
import { registerExportHwpxTool } from './tools/export-hwpx.js';
import { registerExportPptxTool } from './tools/export-pptx.js';
import { registerExportThinkingToolTool } from './tools/export-thinking-tool.js';
import { registerStudentCommentTool } from './tools/generate-student-comment.js';
import { registerRubricTool } from './tools/generate-rubric.js';
import { registerDifferentiatedTextTool } from './tools/generate-differentiated-text.js';
import { registerVocabularyAnalysisTool } from './tools/analyze-vocabulary-level.js';
import { registerMindmapTool } from './tools/generate-mindmap.js';
import { registerListTools } from './tools/list-content.js';
import { registerOfficialDocumentTool } from './tools/generate-official-document.js';
import { registerParentNewsletterTool } from './tools/generate-parent-newsletter.js';
import { registerMeetingMinutesTool } from './tools/generate-meeting-minutes.js';
import { registerParentMessageTool } from './tools/generate-parent-message.js';
import { registerSummarizeDocumentTool } from './tools/summarize-document.js';
import { registerQuizTool } from './tools/generate-quiz.js';
import { registerWorkPlanTool } from './tools/generate-work-plan.js';
import { registerWorkChecklistTool } from './tools/generate-work-checklist.js';
import { registerCheckDocumentFormatTool } from './tools/check-document-format.js';
import { registerCheckPiiTool } from './tools/check-pii.js';
import { registerHistoricalDialogueTool } from './tools/generate-historical-dialogue.js';
import { registerCharacterRoleplayTool } from './tools/generate-character-roleplay.js';
import { registerSeatingChartTool } from './tools/generate-seating-chart.js';
import { registerStudentRosterTool } from './tools/generate-student-roster.js';
import { PROMPTS } from './prompts/index.js';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import type { Request, Response } from 'express';

/* ------------------------------------------------------------------ */
/*  서버 인스턴스 생성 (도구·리소스 등록)                                  */
/* ------------------------------------------------------------------ */

async function createServer() {
  const db = await initDb();

  const server = new McpServer({
    name: 'korean-teacher-mcp',
    version: '1.0.0',
  });

  // Register tools
  registerIngestTool(server, db);
  registerSearchTool(server, db);
  registerWorksheetTool(server, db);
  registerAssessmentTool(server, db);
  registerPblTool(server, db);
  registerDiscussionTool(server, db);
  registerExportHwpxTool(server);
  registerExportPptxTool(server);
  registerExportThinkingToolTool(server);

  // New tools: 교사 업무 지원 및 학습 도구
  registerStudentCommentTool(server);
  registerRubricTool(server, db);
  registerDifferentiatedTextTool(server, db);
  registerVocabularyAnalysisTool(server, db);
  registerMindmapTool(server, db);
  registerListTools(server, db);

  // Phase 1: 행정 문서 및 요약 도구
  registerOfficialDocumentTool(server);
  registerParentNewsletterTool(server);
  registerMeetingMinutesTool(server);
  registerParentMessageTool(server);
  registerSummarizeDocumentTool(server);

  // Phase 2: 퀴즈, 계획서, 체크리스트, 문서 검사
  registerQuizTool(server);
  registerWorkPlanTool(server);
  registerWorkChecklistTool(server);
  registerCheckDocumentFormatTool(server);

  // Phase 3: 개인정보 검사, 역사 대화, 캐릭터 역할극
  registerCheckPiiTool(server);
  registerHistoricalDialogueTool(server);
  registerCharacterRoleplayTool(server);

  // Phase 4: 자리배치도, 명렬표
  registerSeatingChartTool(server);
  registerStudentRosterTool(server);

  // Register prompt resources
  for (const [id, prompt] of Object.entries(PROMPTS)) {
    server.resource(
      `prompt-${id}`,
      `prompt://teacher/${id}`,
      {
        description: prompt.description,
        mimeType: 'text/markdown',
      },
      async () => ({
        contents: [{
          uri: `prompt://teacher/${id}`,
          text: prompt.content,
          mimeType: 'text/markdown',
        }],
      }),
    );
  }

  // Register pptx-styles resource
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  server.resource(
    'pptx-styles',
    'resource://teacher/pptx-styles',
    {
      description: 'PPTX 디자인 스타일 가이드 (교육용 12개 스타일). export_pptx 도구 사용 전 이 리소스를 읽어 적절한 스타일과 theme 값을 선택하세요.',
      mimeType: 'text/markdown',
    },
    async () => {
      const stylesPath = path.join(__dirname, 'resources', 'pptx-styles.md');
      const text = await readFile(stylesPath, 'utf-8');
      return {
        contents: [{
          uri: 'resource://teacher/pptx-styles',
          text,
          mimeType: 'text/markdown',
        }],
      };
    },
  );

  // Register thinking-tools resource
  server.resource(
    'thinking-tools',
    'resource://teacher/thinking-tools',
    {
      description: '사고 도구 활동지 가이드. export_thinking_tool 도구 사용 전 이 리소스를 읽어 사고 루틴 종류와 content 키를 확인하세요.',
      mimeType: 'text/markdown',
    },
    async () => {
      const toolsPath = path.join(__dirname, 'resources', 'thinking-tools.md');
      const text = await readFile(toolsPath, 'utf-8');
      return {
        contents: [{
          uri: 'resource://teacher/thinking-tools',
          text,
          mimeType: 'text/markdown',
        }],
      };
    },
  );

  // Register owpml-conventions resource (HWPX 규격)
  server.resource(
    'owpml-conventions',
    'resource://teacher/owpml-conventions',
    {
      description: 'HWPX(OWPML) 규격 레퍼런스. export_hwpx 도구 사용 전 이 리소스를 읽어 스타일 ID, 표 규격, 금지 패턴을 확인하세요.',
      mimeType: 'text/markdown',
    },
    async () => {
      const refPath = path.join(__dirname, 'resources', 'owpml-conventions.md');
      const text = await readFile(refPath, 'utf-8');
      return {
        contents: [{
          uri: 'resource://teacher/owpml-conventions',
          text,
          mimeType: 'text/markdown',
        }],
      };
    },
  );

  // Register pptxgen-patterns resource (차트·표·도형 코드 패턴)
  server.resource(
    'pptxgen-patterns',
    'resource://teacher/pptxgen-patterns',
    {
      description: 'PptxGenJS 코드 패턴집. 차트(bar/pie/radar/line), 표, 도형, 헬퍼 함수, 12 스타일별 차트 팔레트. export_pptx 고급 기능 사용 전 참조.',
      mimeType: 'text/markdown',
    },
    async () => {
      const refPath = path.join(__dirname, 'resources', 'pptxgen-patterns.md');
      const text = await readFile(refPath, 'utf-8');
      return {
        contents: [{
          uri: 'resource://teacher/pptxgen-patterns',
          text,
          mimeType: 'text/markdown',
        }],
      };
    },
  );

  // Register slide-layouts resource (7종 레이아웃 가이드)
  server.resource(
    'slide-layouts',
    'resource://teacher/slide-layouts',
    {
      description: '슬라이드 레이아웃 가이드 (교육용 7종). <!-- layout:... --> 힌트 주석 문법, 각 레이아웃의 좌표·용도·입력 규칙, 12 스타일별 호환 레이아웃.',
      mimeType: 'text/markdown',
    },
    async () => {
      const refPath = path.join(__dirname, 'resources', 'slide-layouts.md');
      const text = await readFile(refPath, 'utf-8');
      return {
        contents: [{
          uri: 'resource://teacher/slide-layouts',
          text,
          mimeType: 'text/markdown',
        }],
      };
    },
  );

  // Register writing-principles resource (교육 문서 작성 원칙)
  server.resource(
    'writing-principles',
    'resource://teacher/writing-principles',
    {
      description: '교육 문서 작성 원칙 — 개조식 변환, 문서 유형별 가이드(학습지/평가지/공문/수업계획/가정통신문), 흔한 실수 교정, AI 텍스트 주의사항.',
      mimeType: 'text/markdown',
    },
    async () => {
      const refPath = path.join(__dirname, 'resources', 'writing-principles.md');
      const text = await readFile(refPath, 'utf-8');
      return {
        contents: [{
          uri: 'resource://teacher/writing-principles',
          text,
          mimeType: 'text/markdown',
        }],
      };
    },
  );

  // Register Skills as MCP resources (모든 AI 클라이언트에서 접근 가능)
  const skillsDir = path.join(__dirname, 'resources', 'skills');
  try {
    const skillFolders = await readdir(skillsDir);
    for (const folder of skillFolders) {
      const skillPath = path.join(skillsDir, folder);
      const files = await readdir(skillPath);
      for (const file of files) {
        if (!file.endsWith('.md')) continue;
        const resourceName = file === 'SKILL.md'
          ? `skill-${folder}`
          : `skill-${folder}-${file.replace('.md', '')}`;
        const resourceUri = `skill://teacher/${folder}/${file.replace('.md', '')}`;
        const description = file === 'SKILL.md'
          ? `${folder} 스킬 워크플로우 가이드 (트리거, 절차, 도구 연동)`
          : `${folder} 스킬 참조 문서: ${file.replace('.md', '')}`;

        server.resource(
          resourceName,
          resourceUri,
          {
            description,
            mimeType: 'text/markdown',
          },
          async () => {
            const filePath = path.join(skillPath, file);
            const text = await readFile(filePath, 'utf-8');
            return {
              contents: [{
                uri: resourceUri,
                text,
                mimeType: 'text/markdown',
              }],
            };
          },
        );
      }
    }
    console.error(`[korean-teacher-mcp] Registered ${skillFolders.length} skill resource groups`);
  } catch (error) {
    console.error('[korean-teacher-mcp] Skills resources not found, skipping:', error);
  }

  return server;
}

/* ------------------------------------------------------------------ */
/*  Transport 1: stdio (기본값 — Claude Desktop, Cursor, 로컬 CLI)       */
/* ------------------------------------------------------------------ */

async function startStdio(server: McpServer) {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[korean-teacher-mcp] Running on stdio transport');
}

/* ------------------------------------------------------------------ */
/*  Transport 2: Streamable HTTP (원격/다중 연결 — Gemini, Codex 등)      */
/* ------------------------------------------------------------------ */

async function startHttp(server: McpServer) {
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const app = createMcpExpressApp({ host: '0.0.0.0' });

  // 세션별 transport 저장소
  const transports: Record<string, StreamableHTTPServerTransport> = {};

  // POST /mcp — JSON-RPC 요청 수신
  app.post('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;

    try {
      let transport: StreamableHTTPServerTransport;

      if (sessionId && transports[sessionId]) {
        // 기존 세션 재사용
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // 새 세션 초기화
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (id: string) => {
            transports[id] = transport;
            console.error(`[korean-teacher-mcp] Session initialized: ${id}`);
          },
        });

        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            delete transports[sid];
            console.error(`[korean-teacher-mcp] Session closed: ${sid}`);
          }
        };

        // 새 서버 인스턴스를 생성하여 transport에 연결
        const sessionServer = await createServer();
        await sessionServer.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return;
      } else {
        res.status(400).json({
          jsonrpc: '2.0',
          error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
          id: null,
        });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error('[korean-teacher-mcp] Error handling POST /mcp:', error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: '2.0',
          error: { code: -32603, message: 'Internal server error' },
          id: null,
        });
      }
    }
  });

  // GET /mcp — SSE 스트림 연결
  app.get('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    await transports[sessionId].handleRequest(req, res);
  });

  // DELETE /mcp — 세션 종료
  app.delete('/mcp', async (req: Request, res: Response) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }
    try {
      await transports[sessionId].handleRequest(req, res);
    } catch (error) {
      console.error('[korean-teacher-mcp] Error handling DELETE /mcp:', error);
      if (!res.headersSent) {
        res.status(500).send('Error processing session termination');
      }
    }
  });

  // 헬스체크 엔드포인트
  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      server: 'korean-teacher-mcp',
      transport: 'streamable-http',
      activeSessions: Object.keys(transports).length,
    });
  });

  app.listen(PORT, () => {
    console.error(`[korean-teacher-mcp] HTTP server listening on port ${PORT}`);
    console.error(`[korean-teacher-mcp] MCP endpoint: http://localhost:${PORT}/mcp`);
    console.error(`[korean-teacher-mcp] Health check: http://localhost:${PORT}/health`);
  });

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.error('[korean-teacher-mcp] Shutting down...');
    for (const sid of Object.keys(transports)) {
      try {
        await transports[sid].close();
        delete transports[sid];
      } catch (error) {
        console.error(`[korean-teacher-mcp] Error closing session ${sid}:`, error);
      }
    }
    process.exit(0);
  });
}

/* ------------------------------------------------------------------ */
/*  진입점                                                              */
/* ------------------------------------------------------------------ */

async function main() {
  const useHttp = process.argv.includes('--http') || process.env.TRANSPORT === 'http';

  if (useHttp) {
    // HTTP 모드: 각 세션마다 서버 인스턴스를 생성하므로 여기서는 더미 서버 전달
    const server = await createServer();
    await startHttp(server);
  } else {
    // 기본 stdio 모드
    const server = await createServer();
    await startStdio(server);
  }
}

main().catch((err) => {
  console.error('[korean-teacher-mcp] Fatal error:', err);
  process.exit(1);
});
