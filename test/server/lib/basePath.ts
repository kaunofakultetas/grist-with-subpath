import { getAppBasePath, joinUrlWithPath, normalizeBasePath, prependAppBasePath,
  resetAppBasePathCache, stripBasePathFromRequest } from "app/server/lib/basePath";
import * as testUtils from "test/server/testUtils";

import { assert } from "chai";

describe("basePath", function() {
  let env: testUtils.EnvironmentSnapshot;

  beforeEach(function() {
    env = new testUtils.EnvironmentSnapshot();
    resetAppBasePathCache();
  });

  afterEach(function() {
    env.restore();
    resetAppBasePathCache();
  });

  it("should normalize base paths", function() {
    assert.equal(normalizeBasePath(undefined), "");
    assert.equal(normalizeBasePath(""), "");
    assert.equal(normalizeBasePath("/"), "");
    assert.equal(normalizeBasePath("/grist"), "/grist");
    assert.equal(normalizeBasePath("/grist/"), "/grist");
    assert.equal(normalizeBasePath("grist"), "/grist");
  });

  it("should read the base path from GRIST_BASE_PATH", function() {
    process.env.GRIST_BASE_PATH = "/itsk/grist/";
    assert.equal(getAppBasePath(), "/itsk/grist");
    assert.equal(prependAppBasePath("/doc/x"), "/itsk/grist/doc/x");
  });

  it("should treat an empty GRIST_BASE_PATH as hosting at the root", function() {
    process.env.GRIST_BASE_PATH = "";
    assert.equal(getAppBasePath(), "");
    assert.equal(prependAppBasePath("/doc/x"), "/doc/x");
  });

  it("should strip the base path from request urls", function() {
    process.env.GRIST_BASE_PATH = "/itsk/grist";
    const cases: Array<[string, string]> = [
      ["/itsk/grist/o/docs/api/orgs?x=1", "/o/docs/api/orgs?x=1"],
      ["/itsk/grist/doc/abc", "/doc/abc"],
      ["/itsk/grist", "/"],
      ["/itsk/grist?x=1", "/?x=1"],
      ["/itsk/gristly/doc", "/itsk/gristly/doc"],
      ["/status", "/status"],
    ];
    for (const [url, expected] of cases) {
      const req: { url?: string } = { url };
      stripBasePathFromRequest(req as any);
      assert.equal(req.url, expected, `for url ${url}`);
    }
  });

  it("should not strip a matching path twice", function() {
    process.env.GRIST_BASE_PATH = "/itsk/grist";
    const req: { url?: string } = { url: "/itsk/grist/itsk/grist/doc" };
    stripBasePathFromRequest(req as any);
    assert.equal(req.url, "/itsk/grist/doc");
    stripBasePathFromRequest(req as any);
    assert.equal(req.url, "/itsk/grist/doc");
  });

  it("should join urls with paths", function() {
    assert.equal(joinUrlWithPath("https://x.com", ""), "https://x.com/");
    assert.equal(joinUrlWithPath("https://x.com", "/boot"), "https://x.com/boot");
    assert.equal(joinUrlWithPath("https://x.com", "test/login"), "https://x.com/test/login");
    assert.equal(joinUrlWithPath("https://x.com/itsk/grist", "/boot"), "https://x.com/itsk/grist/boot");
    assert.equal(joinUrlWithPath("https://x.com/itsk/grist/", "test/login"),
      "https://x.com/itsk/grist/test/login");
    assert.equal(joinUrlWithPath("https://x.com/itsk/grist", "/api/docs/d1?f=1"),
      "https://x.com/itsk/grist/api/docs/d1?f=1");
  });
});
