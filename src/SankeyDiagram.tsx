import * as d3 from "d3";
import * as d3sankey from "d3-sankey";
import * as React from "react";

import * as Data from "./data";

import * as ModalDialog from "./ModalDialog";

import "./SankeyDiagram.css";
import { makeFullData, SerializedData } from "./types";

type MySankeyNodeExtras = {
  id: string;
  label: string;
}

type MySankeyLinkExtras = {
  color: string;
}

type MySankeyNode = d3sankey.SankeyNode<MySankeyNodeExtras, MySankeyLinkExtras>;
// type MySankeyLink = d3sankey.SankeyLink<MySankeyNodeExtras, MySankeyLinkExtras>;
type MySankeyGraph = d3sankey.SankeyGraph<MySankeyNodeExtras, MySankeyLinkExtras>;
// type MySankeyLayout = d3sankey.SankeyLayout<MySankeyGraph, MySankeyNodeExtras, MySankeyLinkExtras>;

type SavedNodePositions = { [key: string]: number };

function assertDefined<T>(v: T | undefined, name?: string): T {
  if (v === undefined) {
    name = name || "<value>";
    throw new Error(`${name} is undefined`);
  }
  return v;
}

function assertDefinedFunc<T>(name: string, vf: () => T | undefined): () => T {
  return () => assertDefined(vf(), name);
}

function createGraph(input: SerializedData): MySankeyGraph {
  const data = makeFullData(input);

  const idToNodeMap = new Map<string, MySankeyNode>();

  const lookupNode = (id: string): MySankeyNode => {
    const value = idToNodeMap.get(id);
    if (value === undefined) {
      throw new Error("can't find node with id: " + id);
    }
    return value;
  };

  return {
    nodes: data.nodes.map(n => {
      const sankeyNode: MySankeyNode = { ...n };
      idToNodeMap.set(sankeyNode.id, sankeyNode);
      return sankeyNode;
    }),
    links: data.links.map(l => ({
      ...l,
      source: lookupNode(l.sourceId),
      target: lookupNode(l.targetId)
    }))
  };
}

export type Props = {
  showModalDialog: (props: ModalDialog.DataProps) => void;
  data: Data.SSData;
};

export class Component extends React.Component<Props, {}> {
  private ref?: HTMLDivElement;
  private graph?: MySankeyGraph;
  private svg?: SVGSVGElement;

  public componentDidMount() {
    if (super.componentDidMount) {
      super.componentDidMount();
    }

    window.addEventListener("resize", this.resize);
    this.resize();
  }

  public componentWillUnmount() {
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }
    window.removeEventListener("resize", this.resize);
  }

  public componentDidUpdate(prevProps: Props, prevState: {}, snapshot?: never) {
    if (super.componentDidUpdate) {
      super.componentDidUpdate(prevProps, prevState, snapshot);
    }
    if (prevProps.data !== this.props.data) {
      this.regenerate();
    }
  }

  public render() {
    return (
      <div className="SankeyDiagram">
        <div ref={this.setRef} className="SankeyDiagram-chart" />
        <div className="SankeyDiagram-toolbar">
          <div
            className="SankeyDiagram-toolbar-button"
            onClick={this.clickedSavePositions}
          >
            Save positions...
          </div>
        </div>
      </div>
    );
  }

  private setRef = (newRef: HTMLDivElement) => {
    if (this.ref !== undefined) {
      throw new Error("ref already set");
    }
    this.ref = newRef;
  };

  private getRef = assertDefinedFunc("ref", () => this.ref);

  // returns map of id -> height as % of overall graph height
  private recordPositions(): SavedNodePositions {
    const output: SavedNodePositions = {};
    if (this.graph !== undefined) {
      const svg = assertDefined(this.svg, "svg");
      const height = svg.clientHeight;
      this.graph.nodes.forEach((node: MySankeyNode) => {
        if (node.y0 !== undefined) {
          output[node.id] = node.y0 / height;
        }
      });
    }
    return output;
  }

  private selectedNodes = new Set<string>();

  private regenerate = () => {
    const ref = this.getRef();
    const width = ref.clientWidth;
    const height = ref.clientHeight;

    const input = Data.generateData(this.props.data);

    let savedPositions: SavedNodePositions;
    if (this.graph !== undefined) {
      savedPositions = this.recordPositions();
    } else {
      savedPositions = input.nodePositions || {};
    }

    const svg = d3.create<SVGSVGElement>("svg")
      .attr("width", width)
      .attr("height", height);
    this.svg = svg.node() || undefined;

    const sankey = d3sankey.sankey<MySankeyNodeExtras, MySankeyLinkExtras>();

    const xMargin = width * 0.03;
    const yMargin = height * 0.15;

    sankey
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[xMargin, yMargin], [width - xMargin, height - yMargin]]);

    this.graph = sankey(createGraph(input));
    const graph = this.graph;

    graph.nodes.forEach(n => {
      const y = savedPositions[n.id];
      if (y !== undefined) {
        const newY = y * height;
        if (n.y0 !== undefined && n.y1 !== undefined) {
          const h = n.y1 - n.y0;
          n.y1 = newY + h;
        }
        n.y0 = newY;
      }
    });
    sankey.update(graph);

    const f = d3.format(",.0f");
    const format = (d: any) => `${f(d)} candidates`;

    const makeNodeTransform = (n: MySankeyNode) => `translate(${n.x0}, ${n.y0})`;

    const highlightedValue = input.linkToHighlightedValue(this.selectedNodes);

    const nodeColor = (id: string) => this.selectedNodes.has(id) ? "black" : "lightgray";

    const generateFakeLinks = (): typeof graph.links => {
      const output: typeof graph.links = [];
      graph.links.forEach(l => {
        output.push(l);

        const hv = highlightedValue((l.source as MySankeyNode).id, (l.target as MySankeyNode).id);
        if (hv > 0) {
          const w = l.width || 0;
          const newLink = { ...l, width: w * (hv / l.value) };
          output.push(newLink);
          output.push(newLink);
          output.push(newLink);
        }
      });
      return output;
    }

    const fakeLinks = generateFakeLinks();

    const updateFakeLinks = () => {
      const newFLs = generateFakeLinks();
      fakeLinks.forEach((fl, i) => {
        const newFL = newFLs[i];
        fl.y0 = newFL.y0;
        fl.y1 = newFL.y1;
      });
    };

    const links = svg.append("g")
        .attr("fill", "none")
        .attr("stroke-opacity", 0.5)
      .selectAll("g")
      .data(fakeLinks);

    const link = links.enter().append("g")
        .style("mix-blend-mode", "multiply");

    // const gradient = link.append("linearGradient")
    //     .attr("id", d => `${(d.source as MySankeyNode).id}/${(d.target as MySankeyNode).id}`)
    //     .attr("gradientUnits", "userSpaceOnUse")
    //     .attr("x1", d => (d.source as MySankeyNode).x1 || 0)
    //     .attr("x2", d => (d.target as MySankeyNode).x0 || 0);

    // gradient.append("stop")
    //     .attr("offset", "0%")
    //     .attr("stop-color", d => color((d.source as MySankeyNode).id));

    // gradient.append("stop")
    //     .attr("offset", "100%")
    //     .attr("stop-color", d => color((d.target as MySankeyNode).id));

    const path = link.append("path")
        .attr("d", d3sankey.sankeyLinkHorizontal())
        .attr("stroke", d => d.color)  // d => d.value)
        .attr("stroke-width", d => Math.max(1, assertDefined(d.width)));

    link.append("title")
        .text(d => `${(d.source as MySankeyNode).label} → ${(d.target as MySankeyNode).label}\n${format(d.value)}`);

    let mightBeClick = false;

    const dragMove = function(this: SVGGElement, d: MySankeyNode) {
      if (d3.event.dx !== 0 || d3.event.dy !== 0) {
        mightBeClick = false;
      }
      d.y0 += d3.event.dy;
      d3.select(this)
        .attr("transform", makeNodeTransform(d));
      sankey.update(graph);
      updateFakeLinks();
      path.attr("d", d3sankey.sankeyLinkHorizontal());
    };

    const nodes = svg.append("g")
        .attr("stroke", "#000")
        .style("font", "10px sans-serif")
      .selectAll("rect")
      .data(graph.nodes)
      .enter().append("g")
        .attr("transform", makeNodeTransform)
        .on("click", d => alert(`clicked: ${d.id}`))
        .call(d3.drag<SVGGElement, MySankeyNode>()
          .subject(d => d)
          .on("start", function(this: SVGGElement) {
            mightBeClick = true;
            // puts this in front
            if (this.parentElement !== null) {
              this.parentElement.appendChild(this);
            }
          })
          .on("drag", dragMove)
          .on("end", (d: MySankeyNode) => {
            if (mightBeClick) {
              this.toggleSelection(d.id);
            }
          })
        );

    nodes.append("text")
        .attr("stroke", "none")
        .attr("x", d => ((d.x0 || 0) < width / 2 ? (sankey.nodeWidth() + 6) : -6))
        .attr("y", d => ((d.y1 || 0) - (d.y0 || 0)) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => (d.x0 || 0) < width / 2 ? "start" : "end")
        .text(d => d.label);

    nodes.append("rect")
        .attr("height", d => assertDefined(d.y1) - assertDefined(d.y0))
        .attr("width", d => assertDefined(d.x1) - assertDefined(d.x0))
        .attr("fill", d => nodeColor(d.id))
      .append("title")
        .text(d => `${d.label}\n${format(d.value || 0)}`);

    ref.innerHTML = "";
    ref.appendChild(assertDefined(svg.node() || undefined));
  };

  private resize = () => {
    this.regenerate();
  }

  private toggleSelection = (nodeId: string) => {
    if (this.selectedNodes.has(nodeId)) {
      this.selectedNodes.delete(nodeId);
    } else {
      this.selectedNodes.add(nodeId);
    }
    this.regenerate();
  }

  private clickedSavePositions = () => {
    const positions = this.recordPositions();
    this.props.showModalDialog({
      title: "Positions",
      content: JSON.stringify(positions, null, 2)
    });
  }
}
