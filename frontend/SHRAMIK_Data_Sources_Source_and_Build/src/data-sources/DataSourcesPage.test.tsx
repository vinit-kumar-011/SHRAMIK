import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DataSourcesPage } from './DataSourcesPage';
import { mockDataSourcesAdapter } from './mock-adapter';

describe('DataSourcesPage', () => {
  it('combines search/status/type/agency filters and resets them', async () => {
    const user = userEvent.setup();
    render(<DataSourcesPage adapter={mockDataSourcesAdapter} />);
    expect(await screen.findByRole('button', { name: 'PLFS (Periodic Labour Force Survey)' })).toBeTruthy();
    await user.type(screen.getByLabelText('Search sources'), 'naukri');
    expect(await screen.findByRole('button', { name: 'Job Postings — Naukri (Demo)' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'e-Shram Registrations' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Reset' }));
    expect(await screen.findByRole('button', { name: 'e-Shram Registrations' })).toBeTruthy();
    await user.selectOptions(screen.getByRole('combobox', { name: 'Filter by status' }), 'FAILED');
    expect(await screen.findByRole('button', { name: 'State Skill Development Missions' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'e-Shram Registrations' })).toBeNull();
  });

  it('opens a detail drawer, renders its independent tabs and restores focus', async () => {
    const user = userEvent.setup();
    render(<DataSourcesPage adapter={mockDataSourcesAdapter} />);
    const firstSource = await screen.findByRole('button', { name: 'PLFS (Periodic Labour Force Survey)' });
    await user.click(screen.getAllByRole('button', { name: /view/i })[0]);
    const dialog = await screen.findByRole('dialog');
    expect(dialog.textContent).toContain('SYNTHETIC_DEMO');
    expect(dialog.textContent).toContain('Not reported');
    await user.click(within(dialog).getByRole('tab', { name: 'Data Coverage' }));
    expect(await within(dialog).findByText('Unknown')).toBeTruthy();
    await user.click(within(dialog).getByRole('tab', { name: 'Field Mapping' }));
    expect(await within(dialog).findByText('example_source_field')).toBeTruthy();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
    await waitFor(() => expect(document.activeElement).toBe(firstSource));
  });

  it('keeps a not-configured ingestion state explicit', async () => {
    const user = userEvent.setup();
    render(<DataSourcesPage adapter={mockDataSourcesAdapter} />);
    await screen.findByRole('button', { name: 'Job Postings — Naukri (Demo)' });
    await user.click(screen.getAllByRole('button', { name: /view/i })[4]);
    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('tab', { name: 'Ingestion History' }));
    expect(await within(dialog).findByText('No runs recorded')).toBeTruthy();
    expect(dialog.textContent).not.toContain('retrieval completed successfully');
  });

  it('creates a labelled local draft but does not claim a connector exists', async () => {
    const user = userEvent.setup();
    render(<DataSourcesPage adapter={mockDataSourcesAdapter} />);
    await screen.findByRole('button', { name: 'PLFS (Periodic Labour Force Survey)' });
    await user.click(screen.getByRole('button', { name: /add new source/i }));
    await user.type(screen.getByLabelText(/source name/i), 'Demo Workforce Dataset');
    await user.click(screen.getByRole('button', { name: 'Create source draft' }));
    expect(await screen.findByText(/Local demo draft added to this session only/i)).toBeTruthy();
    expect(await screen.findByRole('heading', { name: 'Demo Workforce Dataset' })).toBeTruthy();
    expect(screen.getByText('Not configured')).toBeTruthy();
  });

  it('preserves the registry and provides a retry state when list loading fails', async () => {
    const adapter = { ...mockDataSourcesAdapter, listSources: vi.fn().mockRejectedValue(new Error('Unavailable')) };
    const user = userEvent.setup();
    render(<DataSourcesPage adapter={adapter} />);
    expect(await screen.findByRole('heading', { name: 'Source registry unavailable' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Try again' }));
    await waitFor(() => expect(adapter.listSources).toHaveBeenCalledTimes(2));
  });
});
