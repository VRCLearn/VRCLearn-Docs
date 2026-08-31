import {defineConfig} from 'vite';
import siteConfig from './site.config.json' with {type: 'json'};

const siteMetadataPlugin = {
    name: 'vrclearn-site-metadata',
    transformIndexHtml(html) {
        const replacements = {
            '{{VRCL_ANALYTICS_ID}}': siteConfig.googleAnalyticsMeasurementId,
            '{{VRCL_SITE_DESCRIPTION}}': siteConfig.siteMetadata.description,
            '{{VRCL_SITE_NAME}}': siteConfig.siteName,
            '{{VRCL_SITE_SOCIAL_DESCRIPTION}}': siteConfig.siteMetadata.socialDescription,
            '{{VRCL_SITE_TITLE}}': siteConfig.siteMetadata.title,
            '{{VRCL_CANONICAL_URL}}': siteConfig.homepageUrl
        };

        return Object.entries(replacements).reduce(
            (result, [token, value]) => result.replaceAll(token, value),
            html
        );
    }
};

export default defineConfig({
    plugins: [siteMetadataPlugin]
});
