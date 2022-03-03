declare module 'npm-api' {
  import * as request from 'request';
  import * as through from 'through';
  import * as url from 'url';

  type PackageJson = unknown;
  type PackageJsonDependencies = unknown;

  class List {
    public constructor(name: string, view: View);

    public query(params?: url.URLFormatOptions): Promise<request.Response>;
    public url(query?: url.URLFormatOptions): string;
  }

  class View {
    public constructor(name: string);

    public query(params?: url.URLFormatOptions): Promise<Array<Buffer | string>>;
    public stream(params?: url.URLFormatOptions): through.ThroughStream;
    public url(query?: url.URLFormatOptions): string;
  }

  class Repo {
    public constructor(name: string);

    public package(version?: string): Promise<PackageJson>;
    public version(version: string): Promise<PackageJson>;
    public dependencies(version: string): PackageJsonDependencies;
    public devDependencies(version: string): PackageJsonDependencies;
    public prop(prop: string, version?: string): unknown;
  }

  class Maintainer {
    public constructor(name: string);

    public repos(): Promise<string[]>;
  }

  class NpmApi {
    public List: typeof List;
    public View: typeof View;
    public Repo: typeof Repo;
    public Maintainer: typeof Maintainer;

    // calling the function returned from lib/plugins/downloads, which has 0 arguments.
    public constructor(options?: unknown);

    public view(name: string): View;

    public list(name: string, view: string | View): List;

    public repo(name: string): Repo;

    public maintainer(name: string): Maintainer;
  }

  export = NpmApi;
}
