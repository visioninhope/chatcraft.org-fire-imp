import { nanoid } from "nanoid";
import db, { ChatCraftFunctionTable } from "./db";

export type FunctionModule = {
  name: string;
  description: string;
  parameters: object;
  // eslint-disable-next-line @typescript-eslint/ban-types
  default: Function;
};

export const initialFunctionCode = `/**
* Example Function Module. Each function needs you to define 4 things:
*/

/* 1. Name of your function */
export const name = "example";

/* 2. Description of function, used to describe what it does to an LLM */
export const description = "This function echoes back the input passed to it.";

/**
* 3. A JSON Schema defining the function's parameters. See:
*
* - https://platform.openai.com/docs/guides/gpt/function-calling
* - https://json-schema.org/learn/getting-started-step-by-step
*/
export const parameters = {
 type: "object",
 properties: {
   value: {
     type: "string",
     description: "The value to echo back",
   },
   required: ["value"],
 },
};

/**
 * 4. The function itself. Accepts an Object matching the schema
 * defined in params, returning a Promise<string> (i.e., should be
 * an async function).
 */
export default async function (data) {
 return data.value;
}
`;

/* Turn the raw JS code into a ES Module and import so we can work with the values */
const parseModule = async (code: string) => {
  const blob = new Blob([code], { type: "text/javascript" });
  const url = URL.createObjectURL(blob);

  try {
    const module = await import(/* @vite-ignore */ url);

    // Validate that the module has what we expect
    const { name, description, parameters, default: fn } = module;
    if (typeof name !== "string") {
      throw new Error("missing `name` export");
    }
    if (typeof description !== "string") {
      throw new Error("missing `description` export");
    }
    if (!parameters) {
      throw new Error("missing `parameters` export");
    }
    if (typeof fn !== "function") {
      throw new Error("missing default function export");
    }

    return module as FunctionModule;
  } catch (err: any) {
    console.warn("Unable to parse module", err);
    throw new Error(`Unable to parse module: ${err.message}`);
  } finally {
    URL.revokeObjectURL(url);
  }
};

export class ChatCraftFunction {
  id: string;
  date: Date;
  name: string;
  description: string;
  parameters: object;
  code: string;

  constructor({
    id,
    date,
    name,
    description,
    parameters,
    code,
  }: {
    id?: string;
    date?: Date;
    name: string;
    description: string;
    parameters: object;
    code: string;
  }) {
    this.id = id ?? nanoid();
    this.date = date ?? new Date();
    this.name = name;
    this.description = description;
    this.parameters = parameters;
    this.code = code;
  }

  // Convert code to an ES Module we can run
  toESModule() {
    return parseModule(this.code);
  }

  static async parse(code: string) {
    const { name, description, parameters } = await parseModule(code);
    return new ChatCraftFunction({ name, description, parameters, code });
  }

  // Find in db
  static async find(id: string) {
    const func = await db.functions.get(id);
    if (!func) {
      return;
    }

    return new ChatCraftFunction(func);
  }

  // Save to db
  async save() {
    // Update the date to indicate we've update the chat
    this.date = new Date();

    // Try to update the name/description, since they might have changed
    try {
      const { name, description } = await this.toESModule();

      if (name) {
        this.name = name;
      } else {
        this.name = "function";
      }

      if (description) {
        this.description = description;
      } else {
        this.description = "description...";
      }
    } catch (err) {
      this.name = "function";
      this.description = "unable to parse code";
    }

    // Upsert Chat itself
    return db.functions.put(this.toDB());
  }

  toJSON() {
    return {
      id: this.id,
      date: this.date.toISOString(),
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      code: this.code,
    };
  }

  toDB(): ChatCraftFunctionTable {
    return {
      id: this.id,
      date: this.date,
      name: this.name,
      description: this.description,
      parameters: this.parameters,
      code: this.code,
    };
  }

  static async delete(id: string) {
    const func = await ChatCraftFunction.find(id);
    if (!func) {
      return;
    }

    return db.functions.delete(id);
  }

  static fromDB(func: ChatCraftFunctionTable) {
    return new ChatCraftFunction({ ...func });
  }
}