import streamlit as st
import pandas as pd
import numpy as np
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import seaborn as sns
import matplotlib.pyplot as plt
from datetime import datetime, timedelta
import random

# Configure the Streamlit page
st.set_page_config(
    page_title="🧬 Prairie Genomics Suite",
    page_icon="🧬",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS for better styling
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        color: #2E8B57;
        text-align: center;
        margin-bottom: 2rem;
    }
    .metric-container {
        background: linear-gradient(90deg, #f0f8ff, #e6f3ff);
        padding: 1rem;
        border-radius: 10px;
        margin: 1rem 0;
    }
    .analysis-card {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 10px;
        border-left: 4px solid #2E8B57;
        margin: 1rem 0;
    }
    .sidebar .sidebar-content {
        background: linear-gradient(180deg, #2E8B57, #20B2AA);
    }
</style>
""", unsafe_allow_html=True)

# Generate sample genomics data for demonstration
@st.cache_data
def generate_sample_data():
    """Generate sample RNA-seq data for demonstration"""
    np.random.seed(42)
    n_genes = 1000
    
    genes = [f"Gene_{i:04d}" for i in range(n_genes)]
    log_fold_changes = np.random.normal(0, 2, n_genes)
    p_values = np.random.beta(0.5, 5, n_genes)
    expression_levels = np.random.lognormal(5, 2, n_genes)
    
    # Create some significant genes
    significant_idx = np.random.choice(n_genes, 50, replace=False)
    log_fold_changes[significant_idx] = np.random.choice([-1, 1], 50) * np.random.uniform(2, 5, 50)
    p_values[significant_idx] = np.random.uniform(0, 0.05, 50)
    
    df = pd.DataFrame({
        'Gene': genes,
        'LogFoldChange': log_fold_changes,
        'PValue': p_values,
        'ExpressionLevel': expression_levels,
        'Significant': p_values < 0.05
    })
    
    df['NegLogPValue'] = -np.log10(df['PValue'])
    return df

@st.cache_data
def generate_sample_metadata():
    """Generate sample project and dataset metadata"""
    projects = [
        {'id': 1, 'name': 'Cancer RNA-seq Study', 'datasets': 3, 'analyses': 5, 'status': 'Active'},
        {'id': 2, 'name': 'Neurodegenerative Disease', 'datasets': 2, 'analyses': 3, 'status': 'Complete'},
        {'id': 3, 'name': 'Plant Stress Response', 'datasets': 4, 'analyses': 7, 'status': 'Active'},
    ]
    return pd.DataFrame(projects)

# Sidebar navigation
st.sidebar.markdown("## 🧬 Prairie Genomics Suite")
st.sidebar.markdown("*Making genomics analysis accessible*")

page = st.sidebar.selectbox(
    "Navigate to:",
    ["🏠 Dashboard", "📊 RNA-seq Analysis", "📁 Project Manager", "📈 Visualizations", "⚙️ Settings"]
)

# Main content based on page selection
if page == "🏠 Dashboard":
    st.markdown('<h1 class="main-header">🧬 Prairie Genomics Suite Dashboard</h1>', unsafe_allow_html=True)
    
    # System status metrics
    col1, col2, col3, col4 = st.columns(4)
    
    with col1:
        st.metric(
            label="🔬 Active Analyses",
            value="12",
            delta="3 this week"
        )
    
    with col2:
        st.metric(
            label="📁 Projects",
            value="8",
            delta="2 new"
        )
    
    with col3:
        st.metric(
            label="💾 Data Storage",
            value="2.4 TB",
            delta="0.3 TB this month"
        )
    
    with col4:
        st.metric(
            label="⚡ Queue Status",
            value="Running",
            delta="3 min avg wait"
        )
    
    # Recent activity
    st.subheader("📊 Recent Analysis Activity")
    
    # Generate sample activity data
    time_range = pd.date_range(start=datetime.now() - timedelta(days=7), end=datetime.now(), freq='h')
    activity_data = {
        'Time': time_range,
        'Analyses_Started': np.random.poisson(2, len(time_range)),
        'Analyses_Completed': np.random.poisson(1.8, len(time_range))
    }
    activity_df = pd.DataFrame(activity_data)
    
    fig = px.line(activity_df, x='Time', y=['Analyses_Started', 'Analyses_Completed'], 
                  title="Analysis Activity (Last 7 Days)")
    st.plotly_chart(fig, use_container_width=True)
    
    # Quick project overview
    st.subheader("📁 Project Overview")
    projects_df = generate_sample_metadata()
    st.dataframe(projects_df, use_container_width=True)

elif page == "📊 RNA-seq Analysis":
    st.markdown('<h1 class="main-header">📊 RNA-seq Differential Expression Analysis</h1>', unsafe_allow_html=True)
    
    # Analysis parameters
    st.sidebar.subheader("Analysis Parameters")
    p_value_threshold = st.sidebar.slider("P-value Threshold", 0.001, 0.1, 0.05, 0.001)
    fold_change_threshold = st.sidebar.slider("Fold Change Threshold", 1.0, 5.0, 2.0, 0.1)
    
    # Load sample data
    df = generate_sample_data()
    
    # Filter data based on thresholds
    significant_genes = df[
        (df['PValue'] < p_value_threshold) & 
        (np.abs(df['LogFoldChange']) > np.log2(fold_change_threshold))
    ]
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.metric("Total Genes Analyzed", f"{len(df):,}")
        st.metric("Significant Genes", f"{len(significant_genes):,}")
    
    with col2:
        st.metric("Upregulated", f"{len(significant_genes[significant_genes['LogFoldChange'] > 0]):,}")
        st.metric("Downregulated", f"{len(significant_genes[significant_genes['LogFoldChange'] < 0]):,}")
    
    # Volcano Plot
    st.subheader("🌋 Volcano Plot")
    
    # Create volcano plot
    fig = go.Figure()
    
    # Non-significant genes
    non_sig = df[~df.index.isin(significant_genes.index)]
    fig.add_trace(go.Scatter(
        x=non_sig['LogFoldChange'],
        y=non_sig['NegLogPValue'],
        mode='markers',
        marker=dict(color='lightgray', size=4),
        name='Non-significant',
        hovertemplate='Gene: %{text}<br>Log2FC: %{x:.2f}<br>-log10(p): %{y:.2f}',
        text=non_sig['Gene']
    ))
    
    # Significant genes
    fig.add_trace(go.Scatter(
        x=significant_genes['LogFoldChange'],
        y=significant_genes['NegLogPValue'],
        mode='markers',
        marker=dict(color='red', size=6),
        name='Significant',
        hovertemplate='Gene: %{text}<br>Log2FC: %{x:.2f}<br>-log10(p): %{y:.2f}',
        text=significant_genes['Gene']
    ))
    
    # Add threshold lines
    fig.add_hline(y=-np.log10(p_value_threshold), line_dash="dash", line_color="blue")
    fig.add_vline(x=np.log2(fold_change_threshold), line_dash="dash", line_color="blue")
    fig.add_vline(x=-np.log2(fold_change_threshold), line_dash="dash", line_color="blue")
    
    fig.update_layout(
        title="Volcano Plot - Differential Gene Expression",
        xaxis_title="Log2 Fold Change",
        yaxis_title="-log10(p-value)",
        height=500
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Top significant genes table
    st.subheader("🔬 Top Significant Genes")
    top_genes = significant_genes.nlargest(20, 'NegLogPValue')[['Gene', 'LogFoldChange', 'PValue', 'ExpressionLevel']]
    st.dataframe(top_genes, use_container_width=True)
    
    # Gene expression heatmap
    st.subheader("🔥 Expression Heatmap")
    
    # Select top 50 most significant genes for heatmap
    heatmap_genes = significant_genes.nlargest(50, 'NegLogPValue')
    
    # Generate sample expression data for different conditions
    conditions = ['Control_1', 'Control_2', 'Control_3', 'Treatment_1', 'Treatment_2', 'Treatment_3']
    expression_matrix = np.random.normal(0, 1, (len(heatmap_genes), len(conditions)))
    
    # Add some pattern based on fold changes
    for i, (_, gene) in enumerate(heatmap_genes.iterrows()):
        effect = gene['LogFoldChange'] / 2
        expression_matrix[i, 3:] += effect  # Add effect to treatment samples
    
    fig_heatmap = px.imshow(
        expression_matrix,
        x=conditions,
        y=heatmap_genes['Gene'].values,
        title="Gene Expression Heatmap (Top 50 Significant Genes)",
        color_continuous_scale="RdBu_r"
    )
    fig_heatmap.update_layout(height=800)
    st.plotly_chart(fig_heatmap, use_container_width=True)

elif page == "📁 Project Manager":
    st.markdown('<h1 class="main-header">📁 Project Manager</h1>', unsafe_allow_html=True)
    
    # Project creation form
    with st.expander("➕ Create New Project"):
        with st.form("new_project"):
            project_name = st.text_input("Project Name")
            project_desc = st.text_area("Description")
            organism = st.selectbox("Organism", ["Homo sapiens", "Mus musculus", "Arabidopsis thaliana", "Other"])
            analysis_type = st.selectbox("Analysis Type", ["RNA-seq", "Single-cell RNA-seq", "ChIP-seq", "ATAC-seq"])
            
            if st.form_submit_button("Create Project"):
                st.success(f"Project '{project_name}' created successfully!")
                st.balloons()
    
    # Current projects
    st.subheader("📊 Current Projects")
    projects_df = generate_sample_metadata()
    
    for _, project in projects_df.iterrows():
        with st.container():
            col1, col2, col3, col4 = st.columns([3, 1, 1, 1])
            
            with col1:
                st.markdown(f"**{project['name']}**")
                status_color = "🟢" if project['status'] == 'Active' else "🔵"
                st.markdown(f"{status_color} {project['status']}")
            
            with col2:
                st.metric("Datasets", project['datasets'])
            
            with col3:
                st.metric("Analyses", project['analyses'])
            
            with col4:
                if st.button("Open", key=f"open_{project['id']}"):
                    st.info(f"Opening project: {project['name']}")
            
            st.divider()

elif page == "📈 Visualizations":
    st.markdown('<h1 class="main-header">📈 Advanced Visualizations</h1>', unsafe_allow_html=True)
    
    df = generate_sample_data()
    
    tab1, tab2, tab3 = st.tabs(["🌋 Volcano Plot", "📊 MA Plot", "🎯 Gene Ontology"])
    
    with tab1:
        st.subheader("Interactive Volcano Plot")
        
        # Enhanced volcano plot with gene selection
        selected_genes = st.multiselect(
            "Highlight specific genes:",
            options=df['Gene'].tolist()[:20],  # Show first 20 for demo
            default=[]
        )
        
        fig = px.scatter(
            df, 
            x='LogFoldChange', 
            y='NegLogPValue',
            color='Significant',
            hover_data=['Gene'],
            title="Interactive Volcano Plot"
        )
        
        # Highlight selected genes
        if selected_genes:
            selected_data = df[df['Gene'].isin(selected_genes)]
            fig.add_trace(go.Scatter(
                x=selected_data['LogFoldChange'],
                y=selected_data['NegLogPValue'],
                mode='markers',
                marker=dict(color='yellow', size=10, line=dict(color='black', width=2)),
                name='Selected Genes',
                text=selected_data['Gene']
            ))
        
        st.plotly_chart(fig, use_container_width=True)
    
    with tab2:
        st.subheader("MA Plot (M vs A)")
        
        # Calculate M and A values
        df_ma = df.copy()
        df_ma['M'] = df_ma['LogFoldChange']
        df_ma['A'] = np.log2(df_ma['ExpressionLevel'])
        
        fig_ma = px.scatter(
            df_ma,
            x='A',
            y='M',
            color='Significant',
            hover_data=['Gene'],
            title="MA Plot - Log Fold Change vs Average Expression"
        )
        fig_ma.update_layout(
            xaxis_title="Average Expression (log2)",
            yaxis_title="Log Fold Change (M)"
        )
        st.plotly_chart(fig_ma, use_container_width=True)
    
    with tab3:
        st.subheader("Gene Ontology Analysis")
        
        # Sample GO terms data
        go_terms = {
            'GO_Term': [
                'Cell cycle regulation',
                'DNA repair',
                'Immune response',
                'Metabolic process',
                'Signal transduction',
                'Protein folding'
            ],
            'Gene_Count': [45, 32, 67, 89, 56, 23],
            'P_Value': [0.001, 0.003, 0.0001, 0.02, 0.005, 0.01],
            'Fold_Enrichment': [3.2, 2.8, 4.1, 1.9, 2.5, 3.0]
        }
        go_df = pd.DataFrame(go_terms)
        go_df['NegLogP'] = -np.log10(go_df['P_Value'])
        
        fig_go = px.bar(
            go_df,
            x='NegLogP',
            y='GO_Term',
            color='Fold_Enrichment',
            title="Gene Ontology Enrichment Analysis",
            orientation='h'
        )
        fig_go.update_layout(
            xaxis_title="-log10(p-value)",
            yaxis_title="GO Terms"
        )
        st.plotly_chart(fig_go, use_container_width=True)

elif page == "⚙️ Settings":
    st.markdown('<h1 class="main-header">⚙️ System Settings</h1>', unsafe_allow_html=True)
    
    col1, col2 = st.columns(2)
    
    with col1:
        st.subheader("Analysis Parameters")
        st.slider("Default P-value Threshold", 0.001, 0.1, 0.05)
        st.slider("Default Fold Change Threshold", 1.0, 5.0, 2.0)
        st.selectbox("Default Statistical Test", ["DESeq2", "edgeR", "limma"])
        
        st.subheader("Visualization Settings")
        st.color_picker("Primary Color", "#2E8B57")
        st.selectbox("Default Plot Theme", ["plotly", "plotly_white", "plotly_dark"])
        
    with col2:
        st.subheader("System Information")
        
        info_data = {
            "System": ["Prairie Genomics Suite", "v1.0.0", "Running", "MongoDB Connected"],
            "Status": ["✅ Active", "📦 Latest", "🟢 Online", "🔗 Connected"]
        }
        info_df = pd.DataFrame(info_data)
        st.dataframe(info_df, use_container_width=True)
        
        st.subheader("Database Status")
        st.success("✅ MongoDB Connection: Active")
        st.info("📊 Total Records: 15,432")
        st.info("💾 Storage Used: 2.4 GB")

# Footer
st.markdown("---")
st.markdown(
    """
    <div style='text-align: center; color: #666;'>
        🧬 Prairie Genomics Suite | Making genomics analysis accessible to every researcher
        <br>
        Built with Streamlit • Python • MongoDB
    </div>
    """, 
    unsafe_allow_html=True
)