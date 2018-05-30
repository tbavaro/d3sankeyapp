export type SerializedNode = {
  id?: string;
  label: string;
};

export type SerializedLink = {
  sourceId: string;
  targetId: string;
  value: number;
  color?: string;
};

export type SerializedData = {
  nodes: SerializedNode[];
  links: SerializedLink[];
}

export type Node = Required<SerializedNode>;
export type Link = Required<SerializedLink>;

export type Data = {
  nodes: Node[];
  links: Link[];
};

export function makeFullData(sd: SerializedData): Data {
  const nodeIds = new Set<string>();
  const nodes = sd.nodes.map(sn => {
    const id = (sn.id === undefined) ? sn.label : sn.id;
    if (nodeIds.has(id)) {
      throw new Error("duplicate id: " + id);
    }
    nodeIds.add(id);
    return { ...sn, id: id };
  });

  const links = sd.links.map(sl => {
    [sl.sourceId, sl.targetId].forEach(id => {
      if (!nodeIds.has(id)) {
        throw new Error("missing node id: " + id);
      }
    });
    return { ...sl, color: sl.color || "gray" };
  });

  return {
    nodes: nodes,
    links: links
  };
}
