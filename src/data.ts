import { SerializedData } from "./types";

type NodePath = string[];

type SSPathData = {
  nodes: NodePath;
  instances: number;
};

type SSColorConfigData = {
  sourceId: string;
  targetId: string;
  color: string;
}

type SSNodePositionsData = { [nodeId: string]: number };

export type SSData = {
  paths: SSPathData[];
  colorConfig: SSColorConfigData[];
  nodePositions?: SSNodePositionsData;
};

type LinkData = {
  sourceId: string;
  targetId: string;
  value: number;
  color: string;
};

function generateLinkKey(sourceId: string, targetId: string): string {
  return `${sourceId}|${targetId}`;
}

const alwaysTrue = () => true;

function generateLinks(input: SSData, pathPredicate: (path: NodePath) => boolean): LinkData[] {
  const keyToColor = new Map<string, string>();
  input.colorConfig.forEach(cc => {
    const key = generateLinkKey(cc.sourceId, cc.targetId);
    keyToColor.set(key, cc.color);
  });

  const keyToLinkData = new Map<string, LinkData>();
  const getOrCreateLinkData = (sourceId: string, targetId: string): LinkData => {
    const key = generateLinkKey(sourceId, targetId);
    let linkData = keyToLinkData.get(key);
    if (linkData === undefined) {
      linkData = {
        sourceId: sourceId,
        targetId: targetId,
        value: 0,
        color: keyToColor.get(key) || "gray"
      };
      keyToLinkData.set(key, linkData);
    }
    return linkData;
  };

  input.paths.forEach(path => {
    if (pathPredicate(path.nodes)) {
      path.nodes.forEach((node, i) => {
        if (i > 0) {
          const sourceId = path.nodes[i - 1];
          const targetId = node;
          const d = getOrCreateLinkData(sourceId, targetId);
          d.value += path.instances;
        }
      });
    }
  });

  return Array.from(keyToLinkData.values());
  // return allLinks;
}

function getNodesFromLinks(links: Array<{ sourceId: string, targetId: string}>) {
  const nodeIds = new Set<string>();
  links.forEach(l => {
    nodeIds.add(l.sourceId);
    nodeIds.add(l.targetId);
  });
  return Array.from(nodeIds).map(id => ({ id: id, label: id.replace(/\s*\[.*\]/g, "") }));
}

export function generateData(input: SSData): (SerializedData & {
  nodePositions?: SSNodePositionsData;
  linkToHighlightedValue: (highlightedNodes: Set<string>) => ((sourceId: string, targetId: string) => number);
}) {
  const LINKS: LinkData[] = generateLinks(input, alwaysTrue);

  return {
    "nodes": getNodesFromLinks(LINKS),
    "links": LINKS,
    "nodePositions": input.nodePositions,
    linkToHighlightedValue: (highlightedNodes: Set<string>): ((sourceId: string, targetId: string) => number) => {
      if (highlightedNodes.size === 0) {
        return () => 0;
      }
      const hnArray = Array.from(highlightedNodes);
      const predicate = (path: NodePath) => hnArray.every(n => path.indexOf(n) !== -1);
      const links = generateLinks(input, predicate);
      const keyToValue = new Map<string, number>();
      links.forEach(l => {
        const key = generateLinkKey(l.sourceId, l.targetId);
        keyToValue.set(key, l.value);
      });
      return (sourceId: string, targetId: string): number => {
        return keyToValue.get(generateLinkKey(sourceId, targetId)) || 0;
      };
    }
  };
}

