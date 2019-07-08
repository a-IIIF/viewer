import * as React from 'react';
import * as DOMPurify from 'dompurify';
import Cache from './lib/Cache';
import IManifestData from './interface/IManifestData';
import Config from './lib/Config';
import {useTranslation} from 'react-i18next';

const iifLogo = require('./icons/iiif.png');
require('./css/manifestations-modal.css');
require('./css/file-info.css');

const {t} = useTranslation();

interface IHTMLAnchorElement {
    nodeName: string;
    target?: string;
}

interface IState {
    data: IManifestData | null;
}

declare let global: {
    config: Config;
};

class FileInfo extends React.Component<any, IState> {

    constructor(props: any) {

        super(props);

        this.state = {
            data: null,
        };

        this.updateFileInfo = this.updateFileInfo.bind(this);
        this.showManifestationsModal = this.showManifestationsModal.bind(this);
    }

    render() {
        if (this.state.data === null || this.state.data.restricted) {
            return '';
        }

        if (typeof this.state.data === 'string') {
            return <div id="file-info">{this.state.data}</div>;
        }

        const manifestData = this.state.data;
        const metadataView = [];

        // Add a hook to make all links open a new window
        DOMPurify.addHook('afterSanitizeAttributes', (node: any) => {
            // set all elements owning target to target=_blank
            if ('target' in node) {
                node.setAttribute('target', '_blank');
                // prevent https://www.owasp.org/index.php/Reverse_Tabnabbing
                node.setAttribute('rel', 'noopener noreferrer');
            }
        });

        if (manifestData.description !== undefined) {
            metadataView.push(<div key="description">
                <div className="label">{t('description')}</div>
                <div className="value"dangerouslySetInnerHTML={{ // eslint-disable-line react/no-danger
                    __html: DOMPurify.sanitize(manifestData.description, global.config.getSanitizeRulesSet())
                }} />
            </div>);
        }

        if (manifestData.metadata !== undefined) {
            for (const key in manifestData.metadata) {
                if (manifestData.metadata.hasOwnProperty(key)) {
                    const metadataItem = manifestData.metadata[key];
                    metadataView.push(<div key={key}>
                        <div className="label">{metadataItem.label}</div>
                        <div className="value"dangerouslySetInnerHTML={{ // eslint-disable-line react/no-danger
                                __html: DOMPurify.sanitize(metadataItem.value, global.config.getSanitizeRulesSet())
                            }} />
                    </div>);
                }
            }
        }

        if (manifestData.attribution) {
            metadataView.push(<div key="attribution">
                <div className="label">{t('attribution')}</div>
                <div className="value" dangerouslySetInnerHTML={{ // eslint-disable-line react/no-danger
                    __html: DOMPurify.sanitize(manifestData.attribution, global.config.getSanitizeRulesSet())
                }} />
            </div>);
        }

        if (manifestData.license !== undefined) {
            metadataView.push(<div key="termsOfUsage">
                <div className="label">{t('license')}</div>
                <div className="value"><a href={manifestData.license}>{manifestData.license}</a></div>
            </div>);
        }

        const logo = manifestData.logo;
        if (logo) {
            metadataView.push(<img key="providerLogo" id="provider-logo" src={logo} alt="Logo" title="Logo"/>);
        }

        if (manifestData.manifestations.length > 0) {
            metadataView.push(
                <div key="manifestation">
                    <div id="show-manifestation" onClick={this.showManifestationsModal}>
                        {t('showFile')}
                    </div>
                </div>
            );
        }

        return (
            <div id="file-info">
                <h3>{manifestData.label}</h3>
                {metadataView}
                <a id="iiif-logo" href={manifestData.id} target="_blank" rel="noopener noreferrer">
                    <img src={iifLogo} title="IIIF-Manifest" alt="IIIF-Manifest"/>
                </a>
            </div>
        );
    }

    componentDidMount() {
        Cache.ee.addListener('update-file-info', this.updateFileInfo);
    }


    componentWillUnmount() {
        Cache.ee.removeListener('update-file-info', this.updateFileInfo);
    }

    addBlankTarget(input: string) {
        const tmp = document.createElement('div');
        tmp.innerHTML = input;
        for (let i = 0; i < tmp.children.length; i++) {
            const node: IHTMLAnchorElement = tmp.children[i];
            if (node.nodeName === 'A') {
                node.target = '_blank';
            }
        }
        return tmp.innerHTML;
    }

    updateFileInfo(data: IManifestData) {
        this.setState({data});
    }

    showManifestationsModal() {

        const bodyJsx = [];
        if (this.state.data !== null) {
            const manifestations = this.state.data.manifestations;
            for (const i in manifestations) {
                if (manifestations.hasOwnProperty(i)) {
                    const manifestation = manifestations[i];
                    bodyJsx.push(
                        <div key={i} className="file-manifestation" onClick={() => this.openFile(manifestation.url)}>
                            {manifestation.label}
                        </div>
                    );
                }
            }
        }

        const alertArgs = {
            titleJsx: <span>{t('license')}</span>,
            bodyJsx
        };
        Cache.ee.emit('alert', alertArgs);
    }

    openFile(url: string) {
        const win = window.open(url, '_target');
        if (win) {
            win.focus();
        }
    }
}

export default FileInfo;
