import { NextResponse } from 'next/server';

const JUDGE0_BASE_URL = process.env.JUDGE0_BASE_URL ?? 'https://ce.judge0.com';
const LANGUAGE_ID = 50;

export const runtime = 'nodejs';

type Judge0Result = {
  status?: { id: number; description: string };
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
};

type Judge0Error = {
  error?: string;
  message?: string;
};

function encodeBase64(value: string) {
  return Buffer.from(value, 'utf8').toString('base64');
}

function decodeBase64(value: string | null | undefined) {
  if (!value) return value;
  return Buffer.from(value, 'base64').toString('utf8');
}

function decodeResult(result: Judge0Result): Judge0Result {
  return {
    ...result,
    stdout: decodeBase64(result.stdout),
    stderr: decodeBase64(result.stderr),
    compile_output: decodeBase64(result.compile_output),
    message: decodeBase64(result.message),
  };
}

async function readJudge0Error(response: Response, fallback: string) {
  const body = await response.text();

  if (!body) {
    return `${fallback} (${response.status})`;
  }

  try {
    const result = JSON.parse(body) as Judge0Error;
    return result.error ?? result.message ?? `${fallback} (${response.status})`;
  } catch {
    return `${fallback} (${response.status}): ${body}`;
  }
}

async function runCCode(sourceCode: string, stdin: string): Promise<Judge0Result> {
  const submissionResponse = await fetch(
    `${JUDGE0_BASE_URL}/submissions?base64_encoded=true`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language_id: LANGUAGE_ID,
        source_code: encodeBase64(sourceCode),
        stdin: encodeBase64(stdin),
        cpu_time_limit: 2,
        memory_limit: 256000,
      }),
    },
  );

  if (!submissionResponse.ok) {
    throw new Error(await readJudge0Error(submissionResponse, 'Judge0 submission failed'));
  }

  const submission = (await submissionResponse.json()) as { token?: string };
  if (!submission.token) {
    throw new Error('Judge0 did not return a submission token');
  }

  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const resultResponse = await fetch(
      `${JUDGE0_BASE_URL}/submissions/${submission.token}?base64_encoded=true`,
    );

    if (!resultResponse.ok) {
      throw new Error(await readJudge0Error(resultResponse, 'Judge0 polling failed'));
    }

    const result = decodeResult((await resultResponse.json()) as Judge0Result);
    if (result.status?.id !== 1 && result.status?.id !== 2) {
      return result;
    }
  }

  throw new Error('Execution timed out while waiting for Judge0');
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sourceCode?: unknown; stdin?: unknown };
    const sourceCode = typeof body.sourceCode === 'string' ? body.sourceCode : '';
    const stdin = typeof body.stdin === 'string' ? body.stdin : '';

    if (!sourceCode.trim()) {
      return NextResponse.json(
        { error: 'Add some C code before running.' },
        { status: 400 },
      );
    }

    const result = await runCCode(sourceCode, stdin);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 502 });
    }

    return NextResponse.json({ error: 'Unable to reach Judge0 right now.' }, { status: 502 });
  }
}
