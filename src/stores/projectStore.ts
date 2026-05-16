import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import {
  Project,
  EstimateVersion,
  SelectedWorkItem,
  AutoAssumptions,
  Client,
  Property,
  ProjectStatus,
} from '../types';
import { storage } from '../lib/storage';
import { addDays } from '../lib/format';
import { calculateEstimate } from '../lib/pricingEngine';
import { useSettingsStore } from './settingsStore';

interface ProjectStore {
  projects: Project[];
  // CRUD
  createProject: (
    client: Client,
    property: Property,
    selectedItems: SelectedWorkItem[],
    autoOverrides: Partial<AutoAssumptions>,
    notes?: string,
  ) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  setStatus: (id: string, status: ProjectStatus) => void;
  // Version management
  createNewVersion: (projectId: string, notes?: string) => EstimateVersion;
  // Duplicate / archive
  duplicateProject: (id: string) => Project;
  archiveProject: (id: string) => void;
  // Selectors
  getProject: (id: string) => Project | undefined;
  getCurrentVersion: (id: string) => EstimateVersion | undefined;
}

function persistProjects(projects: Project[]) {
  storage.save(storage.projectsKey, projects);
}

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: storage.load<Project[]>(storage.projectsKey, []),

  createProject: (client, property, selectedItems, autoOverrides, notes = '') => {
    const { pricing, company } = useSettingsStore.getState();

    const result = calculateEstimate(selectedItems, property, pricing, company);

    const version: EstimateVersion = {
      id: uuid(),
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      selectedItems,
      autoAssumptionOverrides: autoOverrides,
      result,
      notes,
    };

    const expiresAt = addDays(new Date(), 30).toISOString();

    const project: Project = {
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      expiresAt,
      versions: [version],
      currentVersionId: version.id,
      client,
      property,
      photoRefs: [],
      blueprintRefs: [],
    };

    const next = [project, ...get().projects];
    persistProjects(next);
    set({ projects: next });
    return project;
  },

  updateProject: (id, patch) => {
    const next = get().projects.map((p) =>
      p.id === id
        ? { ...p, ...patch, updatedAt: new Date().toISOString() }
        : p,
    );
    persistProjects(next);
    set({ projects: next });
  },

  deleteProject: (id) => {
    const next = get().projects.filter((p) => p.id !== id);
    persistProjects(next);
    set({ projects: next });
  },

  setStatus: (id, status) => {
    const next = get().projects.map((p) =>
      p.id === id ? { ...p, status, updatedAt: new Date().toISOString() } : p,
    );
    persistProjects(next);
    set({ projects: next });
  },

  createNewVersion: (projectId, notes = '') => {
    const { pricing, company } = useSettingsStore.getState();
    const project = get().projects.find((p) => p.id === projectId);
    if (!project) throw new Error(`Project ${projectId} not found`);

    const currentVersion = project.versions.find(
      (v) => v.id === project.currentVersionId,
    );
    if (!currentVersion) throw new Error('Current version not found');

    const result = calculateEstimate(
      currentVersion.selectedItems,
      project.property,
      pricing,
      company,
    );

    const newVersion: EstimateVersion = {
      id: uuid(),
      versionNumber: project.versions.length + 1,
      createdAt: new Date().toISOString(),
      selectedItems: [...currentVersion.selectedItems],
      autoAssumptionOverrides: { ...currentVersion.autoAssumptionOverrides },
      result,
      notes,
    };

    const expiresAt = addDays(new Date(), 30).toISOString();

    const updatedProject: Project = {
      ...project,
      versions: [...project.versions, newVersion],
      currentVersionId: newVersion.id,
      status: 'draft',
      expiresAt,
      updatedAt: new Date().toISOString(),
    };

    const next = get().projects.map((p) =>
      p.id === projectId ? updatedProject : p,
    );
    persistProjects(next);
    set({ projects: next });

    return newVersion;
  },

  duplicateProject: (id) => {
    const source = get().projects.find((p) => p.id === id);
    if (!source) throw new Error(`Project ${id} not found`);

    const currentVersion = source.versions.find((v) => v.id === source.currentVersionId);
    if (!currentVersion) throw new Error('Current version not found');

    const newVersionId = uuid();
    const newVersion: EstimateVersion = {
      ...currentVersion,
      id: newVersionId,
      versionNumber: 1,
      createdAt: new Date().toISOString(),
      selectedItems: [...currentVersion.selectedItems],
      autoAssumptionOverrides: { ...currentVersion.autoAssumptionOverrides },
    };

    const expiresAt = addDays(new Date(), 30).toISOString();

    const newProject: Project = {
      ...source,
      id: uuid(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
      expiresAt,
      versions: [newVersion],
      currentVersionId: newVersionId,
      client: { ...source.client },
      property: { ...source.property },
      photoRefs: [],
      blueprintRefs: [],
      archived: false,
    };

    const next = [newProject, ...get().projects];
    persistProjects(next);
    set({ projects: next });
    return newProject;
  },

  archiveProject: (id) => {
    const next = get().projects.map((p) =>
      p.id === id ? { ...p, archived: true, updatedAt: new Date().toISOString() } : p,
    );
    persistProjects(next);
    set({ projects: next });
  },

  getProject: (id) => get().projects.find((p) => p.id === id),

  getCurrentVersion: (id) => {
    const project = get().projects.find((p) => p.id === id);
    if (!project) return undefined;
    return project.versions.find((v) => v.id === project.currentVersionId);
  },
}));
