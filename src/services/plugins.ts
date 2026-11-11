import { PluginSettings } from '../types';

export async function fetchGitHubData(path: string, pluginSettings: PluginSettings): Promise<any> {
  if (!pluginSettings.githubEnabled || !pluginSettings.githubToken) {
    throw new Error('GitHub plugin is disabled or token not configured.');
  }

  const response = await fetch(`https://api.github.com/${path}`, {
    headers: {
      'Authorization': `token ${pluginSettings.githubToken}`,
      'Accept': 'application/vnd.github.v3+json'
    }
  });

  if (!response.ok) {
    throw new Error(`GitHub API error: ${response.statusText}`);
  }

  return response.json();
}
