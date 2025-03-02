// parser-test.ts
import { diffLines } from "diff";
import { walk } from "@std/fs";
import { basename, extname } from "@std/path";

// Import your grammar and semantics directly
import grammar from "./grammar/cool.ohm-bundle.js";
import astSemantics from "./grammar/astSemantics.ts";
import { ASTNode } from "./ast.ts";

// Configuration options
interface ConfigOptions {
  useColors: boolean;
}

const defaultConfig: ConfigOptions = {
  useColors: true,
};

// Parse command line options
function parseOptions(
  args: string[],
): { target: string; config: ConfigOptions } {
  const config = { ...defaultConfig };
  let target = "";

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--no-color" || arg === "--no-colors") {
      config.useColors = false;
    } else if (arg === "--color" || arg === "--colors") {
      config.useColors = true;
    } else if (!arg.startsWith("--") && !target) {
      target = arg;
    }
  }

  return { target, config };
}

// ANSI color codes for terminal output
const colorCodes = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  reset: "\x1b[0m",
};

// Color function that respects the color configuration
function getColors(config: ConfigOptions) {
  if (!config.useColors) {
    // Return no-op color functions when colors are disabled
    return {
      red: (text: string) => text,
      green: (text: string) => text,
      yellow: (text: string) => text,
      blue: (text: string) => text,
      magenta: (text: string) => text,
      cyan: (text: string) => text,
      white: (text: string) => text,
      gray: (text: string) => text,
    };
  }

  // Return ANSI color functions when colors are enabled
  return {
    red: (text: string) => `${colorCodes.red}${text}${colorCodes.reset}`,
    green: (text: string) => `${colorCodes.green}${text}${colorCodes.reset}`,
    yellow: (text: string) => `${colorCodes.yellow}${text}${colorCodes.reset}`,
    blue: (text: string) => `${colorCodes.blue}${text}${colorCodes.reset}`,
    magenta: (text: string) =>
      `${colorCodes.magenta}${text}${colorCodes.reset}`,
    cyan: (text: string) => `${colorCodes.cyan}${text}${colorCodes.reset}`,
    white: (text: string) => `${colorCodes.white}${text}${colorCodes.reset}`,
    gray: (text: string) => `${colorCodes.gray}${text}${colorCodes.reset}`,
  };
}

// Parse file to AST - reusing your existing code
function parseFileToAST(
  filePath: string,
): { success: boolean; result: any; error?: string } {
  try {
    const contents = Deno.readTextFileSync(filePath);
    const match = grammar.match(contents);

    if (match.failed()) {
      return {
        success: false,
        result: null,
        error: match.message,
      };
    }
    const ast = astSemantics(match).toAST() as ASTNode;
    const fileBasename = basename(filePath);

    ast.forEach((n) => {
      n.location.filename = fileBasename;
    });

    return {
      success: true,
      result: ast,
    };
  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    return {
      success: false,
      result: null,
      error: errorMessage,
    };
  }
}

// Normalize the AST dump by standardizing line numbers and other differences
function normalizeAst(content: string): string {
  // Replace all line numbers with a standard placeholder
  let normalized = content.replace(/#\d+/g, "#N");

  // Standardize filename references
  normalized = normalized.replace(/"[^"]*\.test"/, '""');

  // Handle the difference in method declarations
  normalized = normalized.replace(
    /_method\s+#N\s+_object\s+([a-zA-Z0-9_]+)/g,
    "_method\n      $1",
  );

  return normalized;
}

// Function to detect if output represents an error
function isErrorOutput(output: string): boolean {
  // Common error indicators in parser outputs
  return output.includes("syntax error") ||
    output.includes("Expected") ||
    output.includes("error at") ||
    output.includes("Compilation halted") ||
    (output.includes("Line") && output.includes("col") && output.includes("^"));
}

// Compare two AST dumps
function compareAsts(original: string, newAst: string, config: ConfigOptions): {
  isEquivalent: boolean;
  diff: string;
  coloredDiff: string;
} {
  const colors = getColors(config);
  // Check if both are error outputs
  const originalIsError = isErrorOutput(original);
  const newIsError = isErrorOutput(newAst);

  // If both are error outputs, they're considered equivalent
  if (originalIsError && newIsError) {
    return {
      isEquivalent: true,
      diff: "Both parsers reported errors (exact error messages may differ)",
      coloredDiff: colors.blue(
        "Both parsers reported errors (exact error messages may differ)",
      ),
    };
  }

  // If one is an error and the other isn't, they're not equivalent
  if (originalIsError !== newIsError) {
    let diff = "Error status mismatch:\n";
    let coloredDiff = "";

    if (originalIsError) {
      diff += "- Original parser: Error\n+ New parser: Success\n";
      coloredDiff = colors.red("- Original parser: Error\n") +
        colors.green("+ New parser: Success");
    } else {
      diff += "- Original parser: Success\n+ New parser: Error\n";
      coloredDiff = colors.red("- Original parser: Success\n") +
        colors.green("+ New parser: Error");
    }

    return {
      isEquivalent: false,
      diff,
      coloredDiff,
    };
  }

  // If neither are errors, proceed with normal comparison
  const normalizedOriginal = normalizeAst(original);
  const normalizedNew = normalizeAst(newAst);

  // Use diff library to compare line by line
  const differences = diffLines(normalizedOriginal, normalizedNew);

  // Generate readable diff output (plain text version for file)
  let diffOutput = "";
  // Colored version for terminal
  let coloredDiff = "";
  let hasChanges = false;

  // Track line numbers for each diff section
  let lineNumberOrig = 1;
  let lineNumberNew = 1;

  differences.forEach((part) => {
    const lines = part.value.split("\n").filter((line) => line.trim());

    if (part.added) {
      hasChanges = true;
      // Added lines (green with +)
      const formattedLines = lines.map((line, i) => {
        const lineNum = lineNumberNew.toString().padStart(4, " ");
        lineNumberNew++;
        const plainLine = `+ [${lineNum}] ${line}`;
        const coloredLine = colors.green(`+ [${lineNum}] ${line}`);
        return { plain: plainLine, colored: coloredLine };
      });

      formattedLines.forEach((line) => {
        diffOutput += line.plain + "\n";
        coloredDiff += line.colored + "\n";
      });
    } else if (part.removed) {
      hasChanges = true;
      // Removed lines (red with -)
      const formattedLines = lines.map((line, i) => {
        const lineNum = lineNumberOrig.toString().padStart(4, " ");
        lineNumberOrig++;
        const plainLine = `- [${lineNum}] ${line}`;
        const coloredLine = colors.red(`- [${lineNum}] ${line}`);
        return { plain: plainLine, colored: coloredLine };
      });

      formattedLines.forEach((line) => {
        diffOutput += line.plain + "\n";
        coloredDiff += line.colored + "\n";
      });
    } else {
      // Unchanged lines
      const contextLines = 3;
      const lineInfos = lines.map((line, i) => {
        const origLineNum = lineNumberOrig.toString().padStart(4, " ");
        const newLineNum = lineNumberNew.toString().padStart(4, " ");
        lineNumberOrig++;
        lineNumberNew++;
        return {
          line,
          origLineNum,
          newLineNum,
        };
      });

      if (lineInfos.length <= contextLines * 2) {
        // If the section is small, show all lines
        lineInfos.forEach((info) => {
          const plainLine =
            `  [${info.origLineNum}|${info.newLineNum}] ${info.line}`;
          const coloredLine = colors.gray(
            `  [${info.origLineNum}|${info.newLineNum}] ${info.line}`,
          );
          diffOutput += plainLine + "\n";
          coloredDiff += coloredLine + "\n";
        });
      } else {
        // For larger unchanged sections, show just the beginning and end
        const beginLines = lineInfos.slice(0, contextLines);
        const endLines = lineInfos.slice(-contextLines);

        beginLines.forEach((info) => {
          const plainLine =
            `  [${info.origLineNum}|${info.newLineNum}] ${info.line}`;
          const coloredLine = colors.gray(
            `  [${info.origLineNum}|${info.newLineNum}] ${info.line}`,
          );
          diffOutput += plainLine + "\n";
          coloredDiff += coloredLine + "\n";
        });

        // Show a separator for skipped lines
        const skippedCount = lineInfos.length - (contextLines * 2);
        const plainSeparator =
          `  [...] ${skippedCount} identical lines skipped`;
        const coloredSeparator = colors.blue(
          `  [...] ${skippedCount} identical lines skipped`,
        );
        diffOutput += plainSeparator + "\n";
        coloredDiff += coloredSeparator + "\n";

        endLines.forEach((info) => {
          const plainLine =
            `  [${info.origLineNum}|${info.newLineNum}] ${info.line}`;
          const coloredLine = colors.gray(
            `  [${info.origLineNum}|${info.newLineNum}] ${info.line}`,
          );
          diffOutput += plainLine + "\n";
          coloredDiff += coloredLine + "\n";
        });
      }
    }
  });

  return {
    isEquivalent: !hasChanges,
    diff: diffOutput,
    coloredDiff,
  };
}

// Test a single file
async function testFile(
  testFilePath: string,
  config: ConfigOptions,
): Promise<boolean> {
  const colors = getColors(config);
  const originalOutPath = `${testFilePath}.out`;
  const baseFilename = basename(testFilePath);

  console.log(colors.cyan(`Testing ${baseFilename}...`));

  try {
    // Check if original output file exists
    try {
      await Deno.stat(originalOutPath);
    } catch (e) {
      console.error(
        colors.red(`❌ Original output file not found: ${originalOutPath}`),
      );
      return false;
    }

    // Read the original output
    const originalOutput = await Deno.readTextFile(originalOutPath);

    // Parse the file
    const parseResult = parseFileToAST(testFilePath);
    let newOutput = "";

    if (parseResult.success) {
      // Successfully parsed - get AST dump
      newOutput = parseResult.result.dumpWithTypes(0);
    } else {
      // Failed to parse - format error message
      newOutput = parseResult.error || "Unknown parse error";
    }

    // Save the new output with .myout extension
    const myOutPath = `${testFilePath}.myout`;
    await Deno.writeTextFile(myOutPath, newOutput);

    // Compare the outputs
    const { isEquivalent, diff, coloredDiff } = compareAsts(
      originalOutput,
      newOutput,
      config,
    );

    if (isEquivalent) {
      console.log(
        colors.green(
          `✅ ${baseFilename}: Outputs are equivalent (ignoring line numbers)`,
        ),
      );
      return true;
    } else {
      console.log(colors.red(`❌ ${baseFilename}: Outputs differ`));
      console.log(colors.yellow(`Differences:`));
      console.log(coloredDiff);

      // Save the diff to a file for easier review (plain text version)
      const diffOutPath = `${testFilePath}.diff`;
      await Deno.writeTextFile(diffOutPath, diff);
      console.log(colors.cyan(`Diff saved to ${diffOutPath}`));
      return false;
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(
        colors.red(`❌ Error testing ${baseFilename}: ${e.message}`),
      );
    } else {
      console.error(colors.red(`❌ Error testing ${baseFilename}: ${e}`));
    }
    return false;
  }
}

// Main function to test files
async function main(): Promise<void> {
  const args = Deno.args;
  const { target, config } = parseOptions(args);
  const colors = getColors(config);

  if (!target) {
    console.error(
      colors.yellow(
        `Usage: deno run --allow-read --allow-write parser-test.ts [--no-color] [directory or file]`,
      ),
    );
    Deno.exit(1);
  }

  try {
    const stat = await Deno.stat(target);

    if (stat.isFile) {
      // Test a single file
      if (extname(target) === ".test") {
        await testFile(target, config);
      } else {
        console.error(colors.red(`File ${target} is not a .test file`));
      }
    } else if (stat.isDirectory) {
      // Process all .test files in the directory
      console.log(colors.cyan(`Testing all .test files in ${target}...`));
      let count = 0;
      let passed = 0;

      for await (
        const entry of walk(target, {
          exts: ["test"],
          skip: [/node_modules/, /\.git/],
        })
      ) {
        count++;
        const result = await testFile(entry.path, config);
        if (result) passed++;
      }

      // Show summary with colors
      if (passed === count) {
        console.log(
          `\n${colors.green(`Summary: ${passed}/${count} tests passed`)}`,
        );
      } else if (passed === 0) {
        console.log(
          `\n${colors.red(`Summary: ${passed}/${count} tests passed`)}`,
        );
      } else {
        console.log(
          `\n${
            colors.yellow(
              `Summary: ${passed}/${count} tests passed (${
                count - passed
              } failed)`,
            )
          }`,
        );
      }
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(colors.red(`Error: ${e.message}`));
    } else {
      console.error(colors.red(`Error: ${e}`));
    }
  }
}

if (import.meta.main) {
  main();
}
