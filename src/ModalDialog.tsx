import * as React from "react";

import "./ModalDialog.css";

export type DataProps = {
  title: string;
  content: string;
};

export type Props = DataProps & {
  onDismiss: () => void;
};

export class Component extends React.Component<Props, {}> {
  public componentDidMount() {
    if (super.componentDidMount) {
      super.componentDidMount();
    }
    document.addEventListener("keyup", this.onKeyUp);
  }

  public componentWillUnmount() {
    if (super.componentWillUnmount) {
      super.componentWillUnmount();
    }
    document.removeEventListener("keyup", this.onKeyUp);
  }

  public render() {
    return (
      <div
        className="ModalDialog-background"
        onClick={this.props.onDismiss}
      >
        <div className="ModalDialog" onClick={this.swallowClick}>
          <div className="ModalDialog-title">
            {this.props.title}
          </div>
          <div className="ModalDialog-contentContainer">
            <div className="ModalDialog-contentContainer-content">
              {this.props.content}
            </div>
          </div>
        </div>
      </div>
    );
  }

  private swallowClick = (e: React.MouseEvent<any>) => e.stopPropagation();

  private onKeyUp = () => {
    this.props.onDismiss();
  };
}
